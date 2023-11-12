import { type GuildInteraction, UpdatableInteraction } from "@barry/core";
import type { ProfilesSettings } from "@prisma/client";

import { ButtonStyle, ComponentType } from "@discordjs/core";
import {
    ProfileMessageRepository,
    ProfileRepository,
    ProfilesSettingsRepository
} from "../../../../src/modules/marketplace/dependencies/profiles/database/index.js";
import {
    createMockMessageComponentInteraction,
    mockMessage,
    mockUser
} from "@barry/testing";

import { ChannelGuildSettingOption } from "../../../../src/config/options/index.js";
import { DiscordAPIError } from "@discordjs/rest";
import { createMockApplication } from "../../../mocks/application.js";
import { getProfileContent } from "../../../../src/modules/marketplace/dependencies/profiles/editor/functions/content.js";
import { mockProfile } from "./mocks/profile.js";

import ProfilesModule, {
    ManageProfileButton,
    ProfileActionButton
} from "../../../../src/modules/marketplace/dependencies/profiles/index.js";

describe("ProfilesModule", () => {
    const channelID = "48527482987641760";
    const guildID = "68239102456844360";

    let module: ProfilesModule;
    let settings: ProfilesSettings;

    beforeEach(() => {
        const client = createMockApplication();
        module = new ProfilesModule(client);

        settings = {
            channelID: "48527482987641760",
            enabled: true,
            guildID: "68239102456844360",
            lastMessageID: null
        };

        vi.spyOn(module.settings, "getOrCreate").mockResolvedValue(settings);
    });

    describe("constructor", () => {
        it("should set up the repositories correctly", () => {
            expect(module.profileMessages).toBeInstanceOf(ProfileMessageRepository);
            expect(module.profiles).toBeInstanceOf(ProfileRepository);
            expect(module.settings).toBeInstanceOf(ProfilesSettingsRepository);
        });

        it("should post the buttons when a new channel is configured", async () => {
            const postSpy = vi.spyOn(module, "postButtons").mockResolvedValue("91256340920236565");
            const onEditSpy = vi.spyOn(ChannelGuildSettingOption.prototype, "handle").mockResolvedValue();

            const config = module.getConfig();
            const option = config.find((option) => {
                return "store" in option && option.store.getKey() === "channelID";
            }) as ChannelGuildSettingOption<any, any>;

            await option.store.set(guildID, channelID);
            const data = createMockMessageComponentInteraction();
            const interaction = new UpdatableInteraction(data, module.client, vi.fn());

            await option.onEdit(option, interaction as GuildInteraction<UpdatableInteraction>);

            expect(onEditSpy).toHaveBeenCalledOnce();
            expect(postSpy).toHaveBeenCalledOnce();
            expect(postSpy).toHaveBeenCalledWith(channelID);
        });
    });

    describe("flagUser", () => {
        beforeEach(() => {
            vi.spyOn(module.client.api.channels, "editMessage").mockResolvedValue(mockMessage);
            vi.spyOn(module.profiles, "getWithFlaggableMessages").mockResolvedValueOnce({
                ...mockProfile,
                messages: [{
                    guildID: guildID,
                    messageID: "30527482987641765",
                    userID: mockUser.id
                }]
            });
        });

        it("should flag all requests that are newer than 14 days", async () => {
            await module.flagUser(guildID, channelID, mockUser, "Hello World!");

            expect(module.profiles.getWithFlaggableMessages).toHaveBeenCalledOnce();
            expect(module.profiles.getWithFlaggableMessages).toHaveBeenCalledWith(guildID, mockUser.id, 14);
        });
    });

    describe("getContent", () => {
        it("should return undefined if the profile does not exist", async () => {
            const profileSpy = vi.spyOn(module.profiles, "get").mockResolvedValue(null);

            const content = await module.getContent(mockUser.id);

            expect(profileSpy).toHaveBeenCalledOnce();
            expect(profileSpy).toHaveBeenCalledWith(mockUser.id);
            expect(content).toBeUndefined();
        });

        it("should return the content of the profile", async () => {
            const profileSpy = vi.spyOn(module.profiles, "get").mockResolvedValue(mockProfile);
            const userSpy = vi.spyOn(module.client.api.users, "get").mockResolvedValue(mockUser);

            const content = await module.getContent(mockUser.id);

            expect(profileSpy).toHaveBeenCalledOnce();
            expect(profileSpy).toHaveBeenCalledWith(mockUser.id);
            expect(userSpy).toHaveBeenCalledOnce();
            expect(userSpy).toHaveBeenCalledWith(mockUser.id);
            expect(content).toEqual(getProfileContent(mockUser, mockProfile));
        });
    });

    describe("isEnabled", () => {
        it("should return true if the guild has the module enabled", async () => {
            const enabled = await module.isEnabled("68239102456844360");

            expect(enabled).toBe(true);
            expect(module.settings.getOrCreate).toHaveBeenCalledOnce();
            expect(module.settings.getOrCreate).toHaveBeenCalledWith("68239102456844360");
        });

        it("should return false if the guild has the module disabled", async () => {
            settings.enabled = false;

            const enabled = await module.isEnabled("68239102456844360");

            expect(enabled).toBe(false);
            expect(module.settings.getOrCreate).toHaveBeenCalledOnce();
            expect(module.settings.getOrCreate).toHaveBeenCalledWith("68239102456844360");
        });
    });

    describe("postProfile", () => {
        it("should post the profile in the configured channel", async () => {
            const createSpy = vi.spyOn(module.client.api.channels, "createMessage").mockResolvedValue(mockMessage);
            const content = getProfileContent(mockUser, mockProfile);

            await module.postProfile(mockUser, mockProfile, settings);

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

            await module.postProfile(mockUser, mockProfile, settings);

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
            settings.channelID = null;

            await expect(() => module.postProfile(mockUser, mockProfile, settings)).rejects.toThrowError(
                "Failed to post a profile, channel is unknown."
            );
        });

        it("should handle errors when deleting the previous buttons message", async () => {
            vi.spyOn(module.client.api.channels, "createMessage").mockResolvedValue(mockMessage);
            vi.spyOn(module.client.api.channels, "deleteMessage").mockRejectedValue(new Error());

            const loggerSpy = vi.spyOn(module.client.logger, "warn");
            settings.lastMessageID = "91256340920236565";

            await module.postProfile(mockUser, mockProfile, settings);

            expect(loggerSpy).toHaveBeenCalledOnce();
            expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining("Could not delete last message"));
        });
    });

    describe("unflagUser", () => {
        beforeEach(() => {
            vi.spyOn(module.client.api.channels, "editMessage").mockResolvedValue(mockMessage);
            vi.spyOn(module.profiles, "getWithFlaggableMessages").mockResolvedValueOnce({
                ...mockProfile,
                messages: [{
                    guildID: guildID,
                    messageID: "30527482987641765",
                    userID: mockUser.id
                }]
            });
        });

        it("should unflag all requests that are newer than 21 days", async () => {
            await module.unflagUser(guildID, channelID, mockUser);

            expect(module.profiles.getWithFlaggableMessages).toHaveBeenCalledOnce();
            expect(module.profiles.getWithFlaggableMessages).toHaveBeenCalledWith(guildID, mockUser.id, 21);
        });
    });

    describe("#resetProfiles", () => {
        beforeEach(() => {
            vi.spyOn(module.client.api.channels, "editMessage").mockResolvedValue(mockMessage);
            vi.spyOn(module.profiles, "getWithFlaggableMessages").mockResolvedValueOnce({
                ...mockProfile,
                messages: [{
                    guildID: guildID,
                    messageID: "30527482987641765",
                    userID: mockUser.id
                }]
            });
        });

        it("should get all flaggable messages within the specified days", async () => {
            await module.flagUser(guildID, channelID, mockUser, "Hello World!");

            expect(module.profiles.getWithFlaggableMessages).toHaveBeenCalledOnce();
            expect(module.profiles.getWithFlaggableMessages).toHaveBeenCalledWith(guildID, mockUser.id, 14);
        });

        it("should append the provided embeds to the profile content", async () => {
            const editSpy = vi.spyOn(module.client.api.channels, "editMessage");

            await module.flagUser(guildID, channelID, mockUser, "Hello World!");

            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith("48527482987641760", "30527482987641765", {
                content: expect.any(String),
                embeds: [
                    expect.any(Object),
                    expect.any(Object)
                ]
            });
        });

        it("should log an error if the message could not be edited", async () => {
            const error = new Error("Oh no!");
            vi.spyOn(module.client.api.channels, "editMessage").mockRejectedValue(error);

            await module.flagUser(guildID, channelID, mockUser, "Hello World!");

            expect(module.client.logger.error).toHaveBeenCalledOnce();
            expect(module.client.logger.error).toHaveBeenCalledWith(error);
        });

        it("should not log an error if the message could not be edited because it was deleted", async () => {
            const response = {
                code: 10008,
                message: "Unknown message"
            };
            const error = new DiscordAPIError(response, 10008, 404, "DELETE", "", {});
            vi.spyOn(module.client.api.channels, "editMessage").mockRejectedValue(error);

            await module.flagUser(guildID, channelID, mockUser, "Hello World!");

            expect(module.client.logger.error).not.toHaveBeenCalled();
        });
    });
});
