import { ComponentType, MessageFlags } from "@discordjs/core";
import { MessageComponentInteraction, PingInteraction } from "@barry/core";
import {
    createMockMessageComponentInteraction,
    mockPingInteraction
} from "@barry/testing";
import { createMockApplication } from "../../../../mocks/index.js";
import { mockProfile } from "../mocks/profile.js";

import ProfilesModule, { ProfileActionButton } from "../../../../../src/modules/marketplace/dependencies/profiles/index.js";
import ContactProfileEvent from "../../../../../src/modules/marketplace/dependencies/profiles/events/contactProfile.js";
import * as utils from "../../../../../src/modules/marketplace/utils.js";

describe("Contact (InteractionCreate) Event", () => {
    let event: ContactProfileEvent;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new ProfilesModule(client);

        event = new ContactProfileEvent(module);
    });

    describe("execute", () => {
        it("should display the contact information of the user", async () => {
            vi.spyOn(event.module.profiles, "getByMessage").mockResolvedValue(mockProfile);

            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ProfileActionButton.Contact
            });
            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
            const displaySpy = vi.spyOn(utils, "displayContact").mockResolvedValue();

            await event.execute(interaction);

            expect(displaySpy).toHaveBeenCalledOnce();
            expect(displaySpy).toHaveBeenCalledWith(interaction, mockProfile);
        });

        it("should ignore if the interaction was sent outside a guild", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ProfileActionButton.Contact
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
                custom_id: ProfileActionButton.Contact,
                values: []
            });

            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
            const settingsSpy = vi.spyOn(event.module.settings, "getOrCreate");

            await event.execute(interaction);

            expect(settingsSpy).not.toHaveBeenCalled();
        });

        it("should ignore if the interaction does not come from the 'Contact' button", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ProfileActionButton.Report
            });

            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
            const settingsSpy = vi.spyOn(event.module.settings, "getOrCreate");

            await event.execute(interaction);

            expect(settingsSpy).not.toHaveBeenCalled();
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
                content: expect.stringContaining("Failed to find the profile you're looking for."),
                flags: MessageFlags.Ephemeral
            });
        });
    });
});
