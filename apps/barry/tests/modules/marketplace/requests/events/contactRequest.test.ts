import { ComponentType, MessageFlags } from "@discordjs/core";
import { MessageComponentInteraction, PingInteraction } from "@barry-bot/core";
import { createMockMessageComponentInteraction, mockPingInteraction } from "@barry-bot/testing";

import { createMockApplication } from "../../../../mocks/index.js";
import { mockRequest } from "../mocks/request.js";

import RequestsModule, { RequestActionButton } from "../../../../../src/modules/marketplace/dependencies/requests/index.js";
import ContactRequestEvent from "../../../../../src/modules/marketplace/dependencies/requests/events/contactRequest.js";
import * as utils from "../../../../../src/modules/marketplace/utils.js";

describe("Contact (InteractionCreate) Event", () => {
    let event: ContactRequestEvent;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new RequestsModule(client);

        event = new ContactRequestEvent(module);
    });

    describe("execute", () => {
        it("should display the contact information of the request", async () => {
            vi.spyOn(event.module.requests, "getByMessage").mockResolvedValue(mockRequest);

            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: RequestActionButton.Contact
            });

            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
            const displaySpy = vi.spyOn(utils, "displayContact").mockResolvedValue();

            await event.execute(interaction);

            expect(displaySpy).toHaveBeenCalledOnce();
            expect(displaySpy).toHaveBeenCalledWith(interaction, mockRequest);
        });

        it("should ignore if the interaction was sent outside a guild", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: RequestActionButton.Contact
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
                custom_id: RequestActionButton.Contact,
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
                custom_id: RequestActionButton.Report
            });

            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
            const settingsSpy = vi.spyOn(event.module.settings, "getOrCreate");

            await event.execute(interaction);

            expect(settingsSpy).not.toHaveBeenCalled();
        });

        it("should show an error message if the request does not exist", async () => {
            vi.spyOn(event.module.requests, "getByMessage").mockResolvedValue(null);

            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: RequestActionButton.Contact
            });

            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
            const createSpy = vi.spyOn(interaction, "createMessage").mockResolvedValue();

            await event.execute(interaction);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("Failed to find the request you're looking for."),
                flags: MessageFlags.Ephemeral
            });
        });
    });
});
