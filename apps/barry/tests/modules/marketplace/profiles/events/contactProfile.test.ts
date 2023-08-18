import { ComponentType, MessageFlags } from "@discordjs/core";
import { MessageComponentInteraction, PingInteraction } from "@barry/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    createMockMessageComponentInteraction,
    mockChannel,
    mockPingInteraction
} from "@barry/testing";
import { ProfilesSettings } from "@prisma/client";
import { createMockApplication } from "../../../../mocks/index.js";
import { mockProfile } from "../mocks/profile.js";

import ProfilesModule, { ProfileActionButton } from "../../../../../src/modules/marketplace/dependencies/profiles/index.js";
import ContactProfileEvent from "../../../../../src/modules/marketplace/dependencies/profiles/events/contactProfile.js";

describe("Contact (InteractionCreate) Event", () => {
    let event: ContactProfileEvent;
    let settings: ProfilesSettings;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new ProfilesModule(client);

        event = new ContactProfileEvent(module);
        settings = {
            channelID: mockChannel.id,
            enabled: true,
            guildID: "68239102456844360",
            lastMessageID: null
        };

        vi.spyOn(event.module.profilesSettings, "get").mockResolvedValue(settings);
    });

    describe("execute", () => {
        it("should display the contact information of the user", async () => {
            vi.spyOn(event.module.profiles, "getByMessage").mockResolvedValue(mockProfile);

            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ProfileActionButton.Contact
            });
            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
            event.module.displayContact = vi.fn();

            await event.execute(interaction);

            expect(event.module.displayContact).toHaveBeenCalledOnce();
            expect(event.module.displayContact).toHaveBeenCalledWith(interaction, mockProfile);
        });

        it("should ignore if the interaction was sent outside a guild", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ProfileActionButton.Contact
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
                custom_id: ProfileActionButton.Contact,
                values: []
            });

            delete data.guild_id;
            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
            const settingsSpy = vi.spyOn(event.module.profilesSettings, "getOrCreate");

            await event.execute(interaction);

            expect(settingsSpy).not.toHaveBeenCalled();
        });

        it("should ignore if the interaction is not the contact button", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ProfileActionButton.Report
            });

            delete data.guild_id;
            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
            const settingsSpy = vi.spyOn(event.module.profilesSettings, "getOrCreate");

            await event.execute(interaction);

            expect(settingsSpy).not.toHaveBeenCalled();
        });

        it("should show an error message if the profiles are disabled in the guild", async () => {
            settings.enabled = false;

            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ProfileActionButton.Contact
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

        it("should show an error message if the guild has not set a channel for profiles", async () => {
            settings.channelID = null;

            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ProfileActionButton.Contact
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

        it("should show an error message if the profile does not exist", async () => {
            vi.spyOn(event.module.profiles, "getByMessage").mockResolvedValue(null);

            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ProfileActionButton.Contact
            });
            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
            const createSpy = vi.spyOn(interaction, "createMessage");

            await event.execute(interaction);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("I don't have access to that profile."),
                flags: MessageFlags.Ephemeral
            });
        });
    });
});
