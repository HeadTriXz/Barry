import { ButtonStyle, ComponentType, MessageFlags } from "@discordjs/core";
import {
    ProfileMessageRepository,
    ProfileRepository,
    ProfilesSettingsRepository
} from "../../../../src/modules/marketplace/dependencies/profiles/database.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockUser, createMockModalSubmitInteraction, mockMessage } from "@barry/testing";

import { UpdatableInteraction } from "@barry/core";
import { createMockApplication } from "../../../mocks/application.js";
import { getProfileContent } from "../../../../src/modules/marketplace/dependencies/profiles/editor/content.js";
import { mockProfile } from "./mocks/profile.js";

import ProfilesModule, { ManageProfileButton, ProfileActionButton } from "../../../../src/modules/marketplace/dependencies/profiles/index.js";

describe("ProfilesModule", () => {
    let module: ProfilesModule;

    beforeEach(() => {
        const client = createMockApplication();
        module = new ProfilesModule(client);
    });

    describe("constructor", () => {
        it("should set up the repositories correctly", () => {
            expect(module.profileMessages).toBeInstanceOf(ProfileMessageRepository);
            expect(module.profiles).toBeInstanceOf(ProfileRepository);
            expect(module.profilesSettings).toBeInstanceOf(ProfilesSettingsRepository);
        });
    });

    describe("displayContact", () => {
        it("should send the contact information of the user", async () => {
            const data = createMockModalSubmitInteraction();
            const interaction = new UpdatableInteraction(data, module.client, vi.fn());
            interaction.createMessage = vi.fn();

            await module.displayContact(interaction, mockProfile);

            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                components: expect.any(Array),
                content: `<@${mockProfile.userID}> prefers to be contacted using the following information:\n\`\`\`\n${mockProfile.contact}\`\`\``,
                flags: MessageFlags.Ephemeral
            });
        });

        it("should send the default message if the user has no preferred method", async () => {
            const profile = { ...mockProfile, contact: null };

            const data = createMockModalSubmitInteraction();
            const interaction = new UpdatableInteraction(data, module.client, vi.fn());
            interaction.createMessage = vi.fn();

            await module.displayContact(interaction, profile);

            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                components: expect.any(Array),
                content: `<@${profile.userID}> hasn't provided any contact information. You can reach out to them by sending a direct message.`,
                flags: MessageFlags.Ephemeral
            });
        });
    });

    describe("isEnabled", () => {
        it("should return true if the guild has the module enabled", async () => {
            const settingsSpy = vi.spyOn(module.profilesSettings, "get").mockResolvedValue({
                channelID: "48527482987641760",
                enabled: true,
                guildID: "68239102456844360",
                lastMessageID: null
            });

            const enabled = await module.isEnabled("68239102456844360");

            expect(settingsSpy).toHaveBeenCalledOnce();
            expect(settingsSpy).toHaveBeenCalledWith("68239102456844360");
            expect(enabled).toBe(true);
        });

        it("should return false if the guild has the module disabled", async () => {
            const settingsSpy = vi.spyOn(module.profilesSettings, "get").mockResolvedValue({
                channelID: "48527482987641760",
                enabled: false,
                guildID: "68239102456844360",
                lastMessageID: null
            });

            const enabled = await module.isEnabled("68239102456844360");

            expect(settingsSpy).toHaveBeenCalledOnce();
            expect(settingsSpy).toHaveBeenCalledWith("68239102456844360");
            expect(enabled).toBe(false);
        });
    });

    describe("postProfile", () => {
        it("should post the profile in the configured channel", async () => {
            const createSpy = vi.spyOn(module.client.api.channels, "createMessage").mockResolvedValue(mockMessage);
            const content = getProfileContent(mockUser, mockProfile);

            await module.postProfile(mockUser, mockProfile, {
                channelID: "48527482987641760",
                enabled: true,
                guildID: "68239102456844360",
                lastMessageID: null
            });

            expect(createSpy).toHaveBeenCalledTimes(2);
            expect(createSpy).toHaveBeenCalledWith("48527482987641760", {
                ...content,
                components: [{
                    components: [
                        {
                            custom_id: ProfileActionButton.Contact,
                            label: "Contact",
                            style: ButtonStyle.Success,
                            type: ComponentType.Button
                        },
                        {
                            custom_id: ProfileActionButton.Report,
                            label: "Report",
                            style: ButtonStyle.Secondary,
                            type: ComponentType.Button
                        }
                    ],
                    type: ComponentType.ActionRow
                }]
            });
        });

        it("should post the buttons after the profile", async () => {
            const createSpy = vi.spyOn(module.client.api.channels, "createMessage").mockResolvedValue(mockMessage);

            await module.postProfile(mockUser, mockProfile, {
                channelID: "48527482987641760",
                enabled: true,
                guildID: "68239102456844360",
                lastMessageID: null
            });

            expect(createSpy).toHaveBeenCalledTimes(2);
            expect(createSpy).toHaveBeenCalledWith("48527482987641760", {
                components: [{
                    components: [
                        {
                            custom_id: ManageProfileButton.Post,
                            label: "Post Profile",
                            style: ButtonStyle.Success,
                            type: ComponentType.Button
                        },
                        {
                            custom_id: ManageProfileButton.Edit,
                            label: "Edit Profile",
                            style: ButtonStyle.Secondary,
                            type: ComponentType.Button
                        }
                    ],
                    type: ComponentType.ActionRow
                }]
            });
        });

        it("should delete the previous buttons message", async () => {
            vi.spyOn(module.client.api.channels, "createMessage").mockResolvedValue(mockMessage);

            module.client.api.channels.deleteMessage = vi.fn();

            await module.postProfile(mockUser, mockProfile, {
                channelID: "48527482987641760",
                enabled: true,
                guildID: "68239102456844360",
                lastMessageID: "91256340920236565"
            });

            expect(module.client.api.channels.deleteMessage).toHaveBeenCalledOnce();
            expect(module.client.api.channels.deleteMessage).toHaveBeenCalledWith("48527482987641760", "91256340920236565");
        });

        it("should throw an error if the channel is unknown", async () => {
            await expect(() =>
                module.postProfile(mockUser, mockProfile, {
                    channelID: null,
                    enabled: true,
                    guildID: "68239102456844360",
                    lastMessageID: "91256340920236565"
                })
            ).rejects.toThrowError("Failed to post a profile, channel is unknown.");
        });

        it("should handle errors when deleting the previous buttons message", async () => {
            vi.spyOn(module.client.api.channels, "createMessage").mockResolvedValue(mockMessage);
            vi.spyOn(module.client.api.channels, "deleteMessage").mockRejectedValue(new Error());

            const loggerSpy = vi.spyOn(module.client.logger, "warn");

            await module.postProfile(mockUser, mockProfile, {
                channelID: "48527482987641760",
                enabled: true,
                guildID: "68239102456844360",
                lastMessageID: "91256340920236565"
            });

            expect(loggerSpy).toHaveBeenCalledOnce();
            expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining("Could not delete last message"));
        });
    });
});
