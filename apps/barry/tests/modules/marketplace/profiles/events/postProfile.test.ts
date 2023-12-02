import { type ProfilesSettings, ProfileCreationStatus } from "@prisma/client";
import type { ProfileWithMessages } from "../../../../../src/modules/marketplace/dependencies/profiles/database/index.js";

import { ComponentType, MessageFlags } from "@discordjs/core";
import { MessageComponentInteraction, PingInteraction } from "@barry-bot/core";
import {
    createMockMessageComponentInteraction,
    mockChannel,
    mockPingInteraction,
    mockUser
} from "@barry-bot/testing";
import { createMockApplication } from "../../../../mocks/index.js";
import { mockProfile } from "../mocks/profile.js";

import ProfilesModule, { ManageProfileButton } from "../../../../../src/modules/marketplace/dependencies/profiles/index.js";
import PostProfileEvent from "../../../../../src/modules/marketplace/dependencies/profiles/events/postProfile.js";

describe("Post Profile (InteractionCreate) Event", () => {
    let event: PostProfileEvent;
    let profile: ProfileWithMessages;
    let settings: ProfilesSettings;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new ProfilesModule(client);

        event = new PostProfileEvent(module);
        profile = { ...mockProfile, messages: [] };
        settings = {
            channelID: mockChannel.id,
            enabled: true,
            guildID: "68239102456844360",
            lastMessageID: null
        };
    });

    describe("execute", () => {
        it("should post the user's profile", async () => {
            vi.spyOn(event.module.profiles, "getWithMessages").mockResolvedValue(profile);
            vi.spyOn(event.module.settings, "getOrCreate").mockResolvedValue(settings);

            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ManageProfileButton.Post
            });
            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
            event.module.postProfile = vi.fn();

            await event.execute(interaction);

            expect(event.module.postProfile).toHaveBeenCalledOnce();
            expect(event.module.postProfile).toHaveBeenCalledWith(mockUser, profile, settings);
        });

        it("should prompt the user if they'd like to create a new profile if they don't have one yet", async () => {
            vi.spyOn(event.module.profiles, "getWithMessages").mockResolvedValue(null);
            vi.spyOn(event.module.settings, "getOrCreate").mockResolvedValue(settings);

            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ManageProfileButton.Post
            });
            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
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
            profile.creationStatus = ProfileCreationStatus.Preview;

            vi.spyOn(event.module.profiles, "getWithMessages").mockResolvedValue(profile);
            vi.spyOn(event.module.settings, "getOrCreate").mockResolvedValue(settings);

            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ManageProfileButton.Post
            });
            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
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
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ManageProfileButton.Post
            });

            delete data.guild_id;
            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
            const settingsSpy = vi.spyOn(event.module.settings, "getOrCreate");

            await event.execute(interaction);

            expect(settingsSpy).not.toHaveBeenCalled();
        });

        it("should ignore if the interaction is not of type 'MessageComponent'", async () => {
            const interaction = new PingInteraction(mockPingInteraction, event.client, vi.fn());
            const settingsSpy = vi.spyOn(event.module.settings, "getOrCreate");

            await event.execute(interaction);

            expect(settingsSpy).not.toHaveBeenCalled();
        });

        it("should ignore if the interaction does not come from a button", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: ManageProfileButton.Post,
                values: []
            });

            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
            const settingsSpy = vi.spyOn(event.module.settings, "getOrCreate");

            await event.execute(interaction);

            expect(settingsSpy).not.toHaveBeenCalled();
        });

        it("should ignore if the interaction does not come from the 'Post' button", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ManageProfileButton.Edit
            });

            delete data.guild_id;
            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
            const settingsSpy = vi.spyOn(event.module.settings, "getOrCreate");

            await event.execute(interaction);

            expect(settingsSpy).not.toHaveBeenCalled();
        });

        it("should show an error message if the module is disabled in the guild", async () => {
            settings.enabled = false;

            vi.spyOn(event.module.profiles, "getWithMessages").mockResolvedValue(profile);
            vi.spyOn(event.module.settings, "getOrCreate").mockResolvedValue(settings);

            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ManageProfileButton.Post
            });
            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
            const createSpy = vi.spyOn(interaction, "createMessage");

            await event.execute(interaction);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("Profiles are currently disabled for this guild."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should show an error message if the guild has not configured a channel for profiles", async () => {
            settings.channelID = null;

            vi.spyOn(event.module.profiles, "getWithMessages").mockResolvedValue(profile);
            vi.spyOn(event.module.settings, "getOrCreate").mockResolvedValue(settings);

            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ManageProfileButton.Post
            });
            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
            const createSpy = vi.spyOn(interaction, "createMessage");

            await event.execute(interaction);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("This guild hasn't setup their channel for profiles."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should show an error message if the user is still on cooldown", async () => {
            vi.useFakeTimers().setSystemTime(1441827607);

            profile.messages = [{
                messageID: "91256340920236565",
                guildID: "68239102456844360",
                userID: profile.userID
            }];

            vi.spyOn(event.module.profiles, "getWithMessages").mockResolvedValue(profile);
            vi.spyOn(event.module.settings, "getOrCreate").mockResolvedValue(settings);

            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ManageProfileButton.Post
            });
            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
            const createSpy = vi.spyOn(interaction, "createMessage");

            await event.execute(interaction);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("You can post again <t:1441914007:R>."),
                flags: MessageFlags.Ephemeral
            });

            vi.useRealTimers();
        });
    });
});
