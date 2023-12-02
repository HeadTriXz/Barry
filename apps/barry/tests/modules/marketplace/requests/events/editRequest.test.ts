import { type RequestsSettings, RequestStatus } from "@prisma/client";

import { ButtonStyle, ComponentType, MessageFlags } from "@discordjs/core";
import { MessageComponentInteraction, PingInteraction } from "@barry-bot/core";
import {
    createMockMessageComponentInteraction,
    mockChannel,
    mockPingInteraction
} from "@barry-bot/testing";

import { RequestEditor } from "../../../../../src/modules/marketplace/dependencies/requests/editor/RequestEditor.js";
import { createMockApplication } from "../../../../mocks/index.js";
import { mockRequest } from "../mocks/request.js";
import { timeoutContent } from "../../../../../src/common.js";

import RequestsModule, { ManageRequestButton } from "../../../../../src/modules/marketplace/dependencies/requests/index.js";
import EditRequestEvent from "../../../../../src/modules/marketplace/dependencies/requests/events/editRequest.js";

describe("Edit Request (InteractionCreate) Event", () => {
    let event: EditRequestEvent;
    let interaction: MessageComponentInteraction;
    let settings: RequestsSettings;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new RequestsModule(client);

        event = new EditRequestEvent(module);
        settings = {
            channelID: "48527482987641760",
            enabled: true,
            guildID: "68239102456844360",
            lastMessageID: null,
            minCompensation: 50
        };

        vi.spyOn(event.module.settings, "getOrCreate").mockResolvedValue(settings);
        vi.spyOn(client.api.users, "createDM").mockResolvedValue({ ...mockChannel, position: 0 });

        const data = createMockMessageComponentInteraction({
            component_type: ComponentType.Button,
            custom_id: ManageRequestButton.Edit
        });

        interaction = new MessageComponentInteraction(data, client, vi.fn());
        interaction.createFollowupMessage = vi.fn();
        interaction.editOriginalMessage = vi.fn();
    });

    describe("execute", () => {
        it("should edit the attachments if the user selected 'Attachments'", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "edit_request_select",
                values: ["attachments"]
            });
            const requestData = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "edit_specific_request",
                values: ["1"]
            });

            const response = new MessageComponentInteraction(data, event.client, vi.fn());
            const requestResponse = new MessageComponentInteraction(requestData, event.client, vi.fn());

            RequestEditor.prototype.editAttachments = vi.fn();
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(requestResponse);
            vi.spyOn(requestResponse, "awaitMessageComponent").mockResolvedValue(response);
            vi.spyOn(event.module.requests, "getEditableByUser").mockResolvedValue([mockRequest]);

            await event.execute(interaction);

            expect(RequestEditor.prototype.editAttachments).toHaveBeenCalledOnce();
            expect(RequestEditor.prototype.editAttachments).toHaveBeenCalledWith(response, mockChannel.id, true);
        });

        it("should edit the contact information if the user selected 'Contact'", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "edit_request_select",
                values: ["contact"]
            });
            const requestData = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "edit_specific_request",
                values: ["1"]
            });

            const response = new MessageComponentInteraction(data, event.client, vi.fn());
            const requestResponse = new MessageComponentInteraction(requestData, event.client, vi.fn());

            RequestEditor.prototype.editContact = vi.fn();
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(requestResponse);
            vi.spyOn(requestResponse, "awaitMessageComponent").mockResolvedValue(response);
            vi.spyOn(event.module.requests, "getEditableByUser").mockResolvedValue([mockRequest]);

            await event.execute(interaction);

            expect(RequestEditor.prototype.editContact).toHaveBeenCalledOnce();
            expect(RequestEditor.prototype.editContact).toHaveBeenCalledWith(response);
        });

        it("should edit the request if the user selected 'Request'", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "edit_request_select",
                values: ["request"]
            });
            const requestData = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "edit_specific_request",
                values: ["1"]
            });

            const response = new MessageComponentInteraction(data, event.client, vi.fn());
            const requestResponse = new MessageComponentInteraction(requestData, event.client, vi.fn());

            RequestEditor.prototype.editRequest = vi.fn();
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(requestResponse);
            vi.spyOn(requestResponse, "awaitMessageComponent").mockResolvedValue(response);
            vi.spyOn(event.module.requests, "getEditableByUser").mockResolvedValue([mockRequest]);

            await event.execute(interaction);

            expect(RequestEditor.prototype.editRequest).toHaveBeenCalledOnce();
            expect(RequestEditor.prototype.editRequest).toHaveBeenCalledWith(response);
        });

        it("should prompt the user to create a request if they don't have one yet", async () => {
            vi.spyOn(event.module.requests, "getEditableByUser").mockResolvedValue([]);
            const createSpy = vi.spyOn(interaction, "createMessage");

            await event.execute(interaction);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                components: [{
                    components: [{
                        custom_id: ManageRequestButton.Create,
                        label: "Create Request",
                        style: ButtonStyle.Success,
                        type: ComponentType.Button
                    }],
                    type: ComponentType.ActionRow
                }],
                content: "You don't have a request yet. Would you like to create one?",
                flags: MessageFlags.Ephemeral
            });
        });

        it("should ignore if the interaction was sent outside a guild", async () => {
            delete interaction.guildID;

            await event.execute(interaction);

            expect(event.module.settings.getOrCreate).not.toHaveBeenCalled();
        });

        it("should ignore if the interaction is not of type 'MessageComponent'", async () => {
            const interaction = new PingInteraction(mockPingInteraction, event.client, vi.fn());

            await event.execute(interaction);

            expect(event.module.settings.getOrCreate).not.toHaveBeenCalled();
        });

        it("should ignore if the interaction does not come from a button", async () => {
            interaction.data.componentType = ComponentType.StringSelect;

            await event.execute(interaction);

            expect(event.module.settings.getOrCreate).not.toHaveBeenCalled();
        });

        it("should ignore if the interaction does not come from the 'Edit' button", async () => {
            interaction.data.customID = ManageRequestButton.Create;

            await event.execute(interaction);

            expect(event.module.settings.getOrCreate).not.toHaveBeenCalled();
        });

        it("should show an error message if the module is disabled in the guild", async () => {
            const createSpy = vi.spyOn(interaction, "createMessage");
            settings.enabled = false;

            await event.execute(interaction);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("Requests are currently disabled for this guild."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should show an error message if the guild has not configured a channel for requests", async () => {
            const createSpy = vi.spyOn(interaction, "createMessage");
            settings.channelID = null;

            await event.execute(interaction);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("This guild hasn't setup their channel for requests."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should show an error message if the selected request does not exist", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "edit_specific_request",
                values: ["2"]
            });
            const response = new MessageComponentInteraction(data, event.client, vi.fn());
            const editSpy = vi.spyOn(response, "editParent");

            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
            vi.spyOn(event.module.requests, "getEditableByUser").mockResolvedValue([mockRequest]);

            await event.execute(interaction);

            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("Failed to find the request you're looking for.")
            });
        });

        it("should show a timeout message if the user did not select a request", async () => {
            const editSpy = vi.spyOn(interaction, "editParent");
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);
            vi.spyOn(event.module.requests, "getEditableByUser").mockResolvedValue([mockRequest]);

            await event.execute(interaction);

            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith(timeoutContent);
        });

        it("should show a timeout message if the user did not select what to edit", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "edit_specific_request",
                values: ["1"]
            });
            const response = new MessageComponentInteraction(data, event.client, vi.fn());
            response.editOriginalMessage = vi.fn();

            const editSpy = vi.spyOn(response, "editParent");

            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
            vi.spyOn(response, "awaitMessageComponent").mockResolvedValue(undefined);
            vi.spyOn(event.module.requests, "getEditableByUser").mockResolvedValue([mockRequest]);

            await event.execute(interaction);

            expect(editSpy).toHaveBeenCalledTimes(2);
            expect(editSpy).toHaveBeenCalledWith(timeoutContent);
        });
    });

    describe("#editStatus", () => {
        it("should edit the status of the request", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "edit_request_select",
                values: ["status"]
            });
            const requestData = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "edit_specific_request",
                values: ["1"]
            });
            const statusData = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "edit_request_status",
                values: [RequestStatus.Taken]
            });

            const response = new MessageComponentInteraction(data, event.client, vi.fn());
            const requestResponse = new MessageComponentInteraction(requestData, event.client, vi.fn());
            const statusResponse = new MessageComponentInteraction(statusData, event.client, vi.fn());
            const upsertSpy = vi.spyOn(event.module.requests, "upsert");

            RequestEditor.prototype.next = vi.fn();
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(requestResponse);
            vi.spyOn(requestResponse, "awaitMessageComponent").mockResolvedValue(response);
            vi.spyOn(response, "awaitMessageComponent").mockResolvedValue(statusResponse);
            vi.spyOn(event.module.requests, "getEditableByUser").mockResolvedValue([mockRequest]);

            await event.execute(interaction);

            expect(upsertSpy).toHaveBeenCalledOnce();
            expect(upsertSpy).toHaveBeenCalledWith(interaction.user.id, {
                status: RequestStatus.Taken
            }, mockRequest.id);
            expect(RequestEditor.prototype.next).toHaveBeenCalledOnce();
        });

        it("should show a timeout message if the user did not respond", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "edit_request_select",
                values: ["status"]
            });
            const requestData = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "edit_specific_request",
                values: ["1"]
            });

            const response = new MessageComponentInteraction(data, event.client, vi.fn());
            const requestResponse = new MessageComponentInteraction(requestData, event.client, vi.fn());
            const upsertSpy = vi.spyOn(event.module.requests, "upsert");
            const editSpy = vi.spyOn(response, "editParent");

            response.editOriginalMessage = vi.fn();
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(requestResponse);
            vi.spyOn(requestResponse, "awaitMessageComponent").mockResolvedValue(response);
            vi.spyOn(response, "awaitMessageComponent").mockResolvedValue(undefined);
            vi.spyOn(event.module.requests, "getEditableByUser").mockResolvedValue([mockRequest]);

            await event.execute(interaction);

            expect(editSpy).toHaveBeenCalledTimes(2);
            expect(editSpy).toHaveBeenCalledWith(timeoutContent);
            expect(upsertSpy).not.toHaveBeenCalled();
        });

        it("should show an error message if there is no request found", async () => {
            Object.defineProperty(RequestEditor.prototype, "request", {
                get: () => undefined,
                set: () => undefined
            });

            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "edit_request_select",
                values: ["status"]
            });
            const requestData = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "edit_specific_request",
                values: ["1"]
            });
            const statusData = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "edit_request_status",
                values: [RequestStatus.Taken]
            });

            const response = new MessageComponentInteraction(data, event.client, vi.fn());
            const requestResponse = new MessageComponentInteraction(requestData, event.client, vi.fn());
            const statusResponse = new MessageComponentInteraction(statusData, event.client, vi.fn());
            const upsertSpy = vi.spyOn(event.module.requests, "upsert");

            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(requestResponse);
            vi.spyOn(requestResponse, "awaitMessageComponent").mockResolvedValue(response);
            vi.spyOn(response, "awaitMessageComponent").mockResolvedValue(statusResponse);
            vi.spyOn(event.module.requests, "getEditableByUser").mockResolvedValue([mockRequest]);

            await event.execute(interaction);

            expect(upsertSpy).not.toHaveBeenCalled();
        });
    });
});
