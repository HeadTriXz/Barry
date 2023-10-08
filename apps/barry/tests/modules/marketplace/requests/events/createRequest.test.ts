import type { RequestsSettings } from "@prisma/client";

import { ComponentType, MessageFlags } from "@discordjs/core";
import { MessageComponentInteraction, PingInteraction } from "@barry/core";
import { createMockMessageComponentInteraction, mockPingInteraction } from "@barry/testing";

import { RequestEditor } from "../../../../../src/modules/marketplace/dependencies/requests/editor/RequestEditor.js";
import { createMockApplication } from "../../../../mocks/index.js";
import { mockRequest } from "../mocks/request.js";
import { timeoutContent } from "../../../../../src/common.js";

import RequestsModule, { ManageRequestButton } from "../../../../../src/modules/marketplace/dependencies/requests/index.js";
import CreateRequestEvent from "../../../../../src/modules/marketplace/dependencies/requests/events/createRequest.js";

describe("Create Request (InteractionCreate) Event", () => {
    let event: CreateRequestEvent;
    let settings: RequestsSettings;

    beforeEach(() => {
        RequestEditor.prototype.next = vi.fn();

        const client = createMockApplication();
        const module = new RequestsModule(client);

        event = new CreateRequestEvent(module);
        settings = {
            channelID: "48527482987641760",
            enabled: true,
            guildID: "68239102456844360",
            lastMessageID: null,
            minCompensation: 50
        };

        vi.spyOn(event.module.settings, "getOrCreate").mockResolvedValue(settings);
    });

    describe("execute", () => {
        it("should start creating a new request for the user if they have no draft", async () => {
            vi.spyOn(event.module.requests, "getDraft").mockResolvedValue(null);

            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ManageRequestButton.Create
            });
            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());

            await event.execute(interaction);

            expect(RequestEditor.prototype.next).toHaveBeenCalledOnce();
            expect(RequestEditor.prototype.next).toHaveBeenCalledWith(interaction);
        });

        it("should ignore if the interaction was sent outside a guild", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ManageRequestButton.Create
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
                custom_id: ManageRequestButton.Create,
                values: []
            });

            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
            const settingsSpy = vi.spyOn(event.module.settings, "getOrCreate");

            await event.execute(interaction);

            expect(settingsSpy).not.toHaveBeenCalled();
        });

        it("should ignore if the interaction does not come form the 'Create' button", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ManageRequestButton.Edit
            });

            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
            const settingsSpy = vi.spyOn(event.module.settings, "getOrCreate");

            await event.execute(interaction);

            expect(settingsSpy).not.toHaveBeenCalled();
        });

        it("should show an error message if the module is disabled in the guild", async () => {
            settings.enabled = false;

            vi.spyOn(event.module.requests, "getDraft").mockResolvedValue(null);

            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ManageRequestButton.Create
            });
            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
            const editSpy = vi.spyOn(interaction, "editParent");

            await event.execute(interaction);

            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("Requests are currently disabled for this guild.")
            });
        });

        it("should show an error message if the guild has not configured a channel for requests", async () => {
            settings.channelID = null;

            vi.spyOn(event.module.requests, "getDraft").mockResolvedValue(null);

            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ManageRequestButton.Create
            });
            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
            const editSpy = vi.spyOn(interaction, "editParent");

            await event.execute(interaction);

            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("This guild hasn't setup their channel for requests.")
            });
        });

        it("should continue with the draft if the user pressed the 'Continue' button", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ManageRequestButton.Create
            });
            const responseData = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "continue"
            });
            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
            const response = new MessageComponentInteraction(responseData, event.client, vi.fn());

            vi.spyOn(event.module.requests, "getDraft").mockResolvedValue(mockRequest);
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);

            await event.execute(interaction);

            expect(RequestEditor.prototype.next).toHaveBeenCalledOnce();
            expect(RequestEditor.prototype.next).toHaveBeenCalledWith(response);
        });

        it("should delete the draft if the user pressed the 'Discard' button", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ManageRequestButton.Create
            });
            const responseData = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "discard"
            });
            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
            const response = new MessageComponentInteraction(responseData, event.client, vi.fn());
            const deleteSpy = vi.spyOn(event.module.requests, "delete");

            vi.spyOn(event.module.requests, "getDraft").mockResolvedValue(mockRequest);
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);

            await event.execute(interaction);

            expect(deleteSpy).toHaveBeenCalledOnce();
            expect(deleteSpy).toHaveBeenCalledWith(mockRequest.id);
            expect(RequestEditor.prototype.next).toHaveBeenCalledOnce();
            expect(RequestEditor.prototype.next).toHaveBeenCalledWith(response);
        });

        it("should update the message if the user pressed the 'Nevermind' button", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ManageRequestButton.Create
            });
            const responseData = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "nevermind"
            });
            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
            const response = new MessageComponentInteraction(responseData, event.client, vi.fn());
            const editSpy = vi.spyOn(response, "editParent");

            vi.spyOn(event.module.requests, "getDraft").mockResolvedValue(mockRequest);
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);

            await event.execute(interaction);

            expect(RequestEditor.prototype.next).not.toHaveBeenCalled();
            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith({
                components: [],
                content: expect.stringContaining("Okay! I'll keep the draft until you're ready."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should show a timeout message if the user did not select an option", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: ManageRequestButton.Create
            });
            const interaction = new MessageComponentInteraction(data, event.client, vi.fn());
            const editSpy = vi.spyOn(interaction, "editParent");

            interaction.editOriginalMessage = vi.fn();
            vi.spyOn(event.module.requests, "getDraft").mockResolvedValue(mockRequest);
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

            await event.execute(interaction);

            expect(RequestEditor.prototype.next).not.toHaveBeenCalled();
            expect(editSpy).toHaveBeenCalledTimes(2);
            expect(editSpy).toHaveBeenCalledWith(timeoutContent);
        });
    });
});
