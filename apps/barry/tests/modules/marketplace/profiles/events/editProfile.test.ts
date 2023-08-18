import { APIChannel, ComponentType, MessageFlags } from "@discordjs/core";
import { MessageComponentInteraction, PingInteraction } from "@barry/core";
import { ProfileCreationStatus, ProfilesSettings } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    createMockMessageComponentInteraction,
    mockChannel,
    mockPingInteraction
} from "@barry/testing";

import { ProfileEditor } from "../../../../../src/modules/marketplace/dependencies/profiles/editor/ProfileEditor.js";
import { createMockApplication } from "../../../../mocks/index.js";
import { mockProfile } from "../mocks/profile.js";
import { timeoutContent } from "../../../../../src/modules/marketplace/dependencies/profiles/editor/content.js";

import ProfilesModule, { ManageProfileButton } from "../../../../../src/modules/marketplace/dependencies/profiles/index.js";
import EditProfileEvent from "../../../../../src/modules/marketplace/dependencies/profiles/events/editProfile.js";

describe("Edit Profile (InteractionCreate) Event", () => {
    let event: EditProfileEvent;
    let interaction: MessageComponentInteraction;
    let settings: ProfilesSettings;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new ProfilesModule(client);

        event = new EditProfileEvent(module);
        settings = {
            channelID: mockChannel.id,
            enabled: true,
            guildID: "68239102456844360",
            lastMessageID: null
        };

        const data = createMockMessageComponentInteraction({
            component_type: ComponentType.Button,
            custom_id: ManageProfileButton.Edit
        });

        interaction = new MessageComponentInteraction(data, client, vi.fn());

        vi.spyOn(client.api.users, "createDM").mockResolvedValue(mockChannel as APIChannel);
        vi.spyOn(module.profilesSettings, "get").mockResolvedValue(settings);
    });

    describe("execute", () => {
        it("should edit the availability if the user selected 'Availability'", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "edit_profile_select",
                values: ["availability"]
            });
            const response = new MessageComponentInteraction(data, event.client, vi.fn());

            ProfileEditor.prototype.editAvailability = vi.fn();
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
            vi.spyOn(event.module.profiles, "get").mockResolvedValue(mockProfile);

            await event.execute(interaction);

            expect(ProfileEditor.prototype.editAvailability).toHaveBeenCalledOnce();
            expect(ProfileEditor.prototype.editAvailability).toHaveBeenCalledWith(response);
        });

        it("should edit the banner if the user selected 'Banner'", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "edit_profile_select",
                values: ["banner"]
            });

            const response = new MessageComponentInteraction(data, event.client, vi.fn());

            ProfileEditor.prototype.editBanner = vi.fn();
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
            vi.spyOn(event.module.profiles, "get").mockResolvedValue(mockProfile);

            await event.execute(interaction);

            expect(ProfileEditor.prototype.editBanner).toHaveBeenCalledOnce();
            expect(ProfileEditor.prototype.editBanner).toHaveBeenCalledWith(response, mockChannel.id, true);
        });

        it("should edit the contact information if the user selected 'Contact'", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "edit_profile_select",
                values: ["contact"]
            });

            const response = new MessageComponentInteraction(data, event.client, vi.fn());

            ProfileEditor.prototype.editContact = vi.fn();
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
            vi.spyOn(event.module.profiles, "get").mockResolvedValue(mockProfile);

            await event.execute(interaction);

            expect(ProfileEditor.prototype.editContact).toHaveBeenCalledOnce();
            expect(ProfileEditor.prototype.editContact).toHaveBeenCalledWith(response);
        });

        it("should edit the profile if the user selected 'Profile'", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "edit_profile_select",
                values: ["profile"]
            });

            const response = new MessageComponentInteraction(data, event.client, vi.fn());

            ProfileEditor.prototype.editProfile = vi.fn();
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
            vi.spyOn(event.module.profiles, "get").mockResolvedValue(mockProfile);

            await event.execute(interaction);

            expect(ProfileEditor.prototype.editProfile).toHaveBeenCalledOnce();
            expect(ProfileEditor.prototype.editProfile).toHaveBeenCalledWith(response);
        });

        it("should prompt the user if they'd like to create a new profile if they don't have one yet", async () => {
            vi.spyOn(event.module.profiles, "get").mockResolvedValue(null);
            const createSpy = vi.spyOn(interaction, "createMessage");

            await event.execute(interaction);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                components: expect.any(Array),
                content: "You don't have a profile yet. Would you like to create one?",
                flags: MessageFlags.Ephemeral
            });
        });

        it("should prompt the user if they'd like to finish their profile if they haven't yet", async () => {
            vi.spyOn(event.module.profiles, "get").mockResolvedValue({ ...mockProfile, creationStatus: ProfileCreationStatus.Profile });
            const createSpy = vi.spyOn(interaction, "createMessage");

            await event.execute(interaction);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                components: expect.any(Array),
                content: "You haven't finished your profile yet. Would you like to continue?",
                flags: MessageFlags.Ephemeral
            });
        });

        it("should ignore if the interaction was sent outside a guild", async () => {
            delete interaction.guildID;
            const settingsSpy = vi.spyOn(event.module.profilesSettings, "get");

            await event.execute(interaction);

            expect(settingsSpy).not.toHaveBeenCalled();
        });

        it("should ignore if the interaction is not of type 'MessageComponent'", async () => {
            const interaction = new PingInteraction(mockPingInteraction, event.client, vi.fn());
            const settingsSpy = vi.spyOn(event.module.profilesSettings, "get");

            await event.execute(interaction);

            expect(settingsSpy).not.toHaveBeenCalled();
        });

        it("should ignore if the interaction does not come from a button", async () => {
            const settingsSpy = vi.spyOn(event.module.profilesSettings, "get");
            interaction.data.componentType = ComponentType.StringSelect;

            await event.execute(interaction);

            expect(settingsSpy).not.toHaveBeenCalled();
        });

        it("should ignore if the interaction is not the edit button", async () => {
            const settingsSpy = vi.spyOn(event.module.profilesSettings, "get");
            interaction.data.customID = ManageProfileButton.Create;

            await event.execute(interaction);

            expect(settingsSpy).not.toHaveBeenCalled();
        });

        it("should show an error message if the profiles are disabled in the guild", async () => {
            const createSpy = vi.spyOn(interaction, "createMessage");
            settings.enabled = false;

            await event.execute(interaction);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("Profiles are currently disabled for this guild."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should show an error message if the guild has not set a channel for profiles", async () => {
            const createSpy = vi.spyOn(interaction, "createMessage");
            settings.channelID = null;

            await event.execute(interaction);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("This guild hasn't setup their channel for profiles."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should show a timeout message if the user did not respond", async () => {
            interaction.editOriginalMessage = vi.fn();

            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);
            vi.spyOn(event.module.profiles, "get").mockResolvedValue(mockProfile);

            await event.execute(interaction);

            expect(interaction.editOriginalMessage).toHaveBeenCalledOnce();
            expect(interaction.editOriginalMessage).toHaveBeenCalledWith(timeoutContent);
        });
    });
});
