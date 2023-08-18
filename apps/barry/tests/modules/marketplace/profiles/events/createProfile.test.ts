import { MessageComponentInteraction, PingInteraction } from "@barry/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    createMockMessageComponentInteraction,
    mockChannel,
    mockPingInteraction
} from "@barry/testing";
import { ComponentType } from "@discordjs/core";
import { ProfileEditor } from "../../../../../src/modules/marketplace/dependencies/profiles/editor/ProfileEditor.js";
import { ProfilesSettings } from "@prisma/client";
import { createMockApplication } from "../../../../mocks/index.js";
import { mockProfile } from "../mocks/profile.js";

import ProfilesModule, { ManageProfileButton } from "../../../../../src/modules/marketplace/dependencies/profiles/index.js";
import CreateProfileEvent from "../../../../../src/modules/marketplace/dependencies/profiles/events/createProfile.js";

describe("Create Profile (InteractionCreate) Event", () => {
    let event: CreateProfileEvent;
    let settings: ProfilesSettings;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new ProfilesModule(client);

        event = new CreateProfileEvent(module);
        settings = {
            channelID: mockChannel.id,
            enabled: true,
            guildID: "68239102456844360",
            lastMessageID: null
        };

        vi.spyOn(event.module.profilesSettings, "get").mockResolvedValue(settings);
    });

    describe("execute", () => {
        it("should start creating a new profile for the user", async () => {
            ProfileEditor.prototype.next = vi.fn();

            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ManageProfileButton.Create
            });
            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());

            await event.execute(interaction);

            expect(ProfileEditor.prototype.next).toHaveBeenCalledOnce();
            expect(ProfileEditor.prototype.next).toHaveBeenCalledWith(interaction);
        });

        it("should ignore if the interaction was sent outside a guild", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ManageProfileButton.Create
            });

            delete data.guild_id;
            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
            const settingsSpy = vi.spyOn(event.module.profilesSettings, "getOrCreate");

            await event.execute(interaction);

            expect(settingsSpy).not.toHaveBeenCalled();
        });

        it("should ignore if the interaction is not of type 'MessageComponent'", async () => {
            const interaction = new PingInteraction(mockPingInteraction, event.client, vi.fn());
            const settingsSpy = vi.spyOn(event.module.profilesSettings, "getOrCreate");

            await event.execute(interaction);

            expect(settingsSpy).not.toHaveBeenCalled();
        });

        it("should ignore if the interaction does not come from a button", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: ManageProfileButton.Create,
                values: []
            });

            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
            const settingsSpy = vi.spyOn(event.module.profilesSettings, "getOrCreate");

            await event.execute(interaction);

            expect(settingsSpy).not.toHaveBeenCalled();
        });

        it("should ignore if the interaction is not the create button", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ManageProfileButton.Edit
            });

            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
            const settingsSpy = vi.spyOn(event.module.profilesSettings, "getOrCreate");

            await event.execute(interaction);

            expect(settingsSpy).not.toHaveBeenCalled();
        });

        it("should show an error message if the profiles are disabled in the guild", async () => {
            settings.enabled = false;

            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ManageProfileButton.Create
            });
            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
            const editSpy = vi.spyOn(interaction, "editParent");

            await event.execute(interaction);

            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("Profiles are currently disabled for this guild.")
            });
        });

        it("should show an error message if the guild has not set a channel for profiles", async () => {
            settings.channelID = null;

            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ManageProfileButton.Create
            });
            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
            const editSpy = vi.spyOn(interaction, "editParent");

            await event.execute(interaction);

            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("This guild hasn't setup their channel for profiles.")
            });
        });

        it("should show an error message if the user already has a profile", async () => {
            vi.spyOn(event.module.profiles, "get").mockResolvedValue({ ...mockProfile, creationStatus: null });

            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ManageProfileButton.Create
            });
            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
            const editSpy = vi.spyOn(interaction, "editParent");

            await event.execute(interaction);

            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("You already have a profile, use `Edit Profile` instead.")
            });
        });
    });
});
