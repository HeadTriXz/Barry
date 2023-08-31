import type { RequestsSettings } from "@prisma/client";

import { ButtonStyle, ComponentType, MessageFlags } from "@discordjs/core";
import { MessageComponentInteraction, PingInteraction } from "@barry/core";
import { createMockMessageComponentInteraction, mockPingInteraction } from "@barry/testing";
import { createMockApplication } from "../../../../mocks/application.js";
import { mockRequest } from "../mocks/request.js";
import { timeoutContent } from "../../../../../src/modules/marketplace/constants.js";

import RequestsModule, { ManageRequestButton } from "../../../../../src/modules/marketplace/dependencies/requests/index.js";
import PostRequestEvent from "../../../../../src/modules/marketplace/dependencies/requests/events/postRequest.js";

describe("Post Request (InteractionCreate) Event", () => {
    let event: PostRequestEvent;
    let interaction: MessageComponentInteraction;
    let settings: RequestsSettings;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new RequestsModule(client);
        module.postRequest = vi.fn();

        event = new PostRequestEvent(module);
        settings = {
            channelID: "48527482987641760",
            enabled: true,
            guildID: "68239102456844360",
            lastMessageID: null,
            minCompensation: 50
        };

        const data = createMockMessageComponentInteraction({
            component_type: ComponentType.Button,
            custom_id: ManageRequestButton.Post
        });

        interaction = new MessageComponentInteraction(data, event.client, vi.fn());
        interaction.editOriginalMessage = vi.fn();

        vi.spyOn(event.module.requestsSettings, "getOrCreate").mockResolvedValue(settings);
    });

    describe("execute", () => {
        it("should post the selected request", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "post_specific_request",
                values: ["1"]
            });
            const response = new MessageComponentInteraction(data, event.client, vi.fn());

            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
            vi.spyOn(event.module.requests, "getAvailableByUser").mockResolvedValue([mockRequest]);
            vi.spyOn(event.module.requestMessages, "getLatest").mockResolvedValue(null);

            await event.execute(interaction);

            expect(event.module.postRequest).toHaveBeenCalledOnce();
            expect(event.module.postRequest).toHaveBeenCalledWith(interaction.user, mockRequest, settings);
        });

        it("should prompt the user if they'd like to create a new request if they don't have one yet", async () => {
            vi.spyOn(event.module.requests, "getAvailableByUser").mockResolvedValue([]);
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
            const settingsSpy = vi.spyOn(event.module.requestsSettings, "getOrCreate");

            await event.execute(interaction);

            expect(settingsSpy).not.toHaveBeenCalled();
        });

        it("should ignore if the interaction is not of type 'MessageComponent'", async () => {
            const interaction = new PingInteraction(mockPingInteraction, event.client, vi.fn());
            const settingsSpy = vi.spyOn(event.module.requestsSettings, "getOrCreate");

            await event.execute(interaction);

            expect(settingsSpy).not.toHaveBeenCalled();
        });

        it("should ignore if the interaction does not come from a button", async () => {
            interaction.data.componentType = ComponentType.StringSelect;
            const settingsSpy = vi.spyOn(event.module.requestsSettings, "getOrCreate");

            await event.execute(interaction);

            expect(settingsSpy).not.toHaveBeenCalled();
        });

        it("should ignore if the interaction does not come the 'Post' button", async () => {
            interaction.data.customID = ManageRequestButton.Edit;
            const settingsSpy = vi.spyOn(event.module.requestsSettings, "getOrCreate");

            await event.execute(interaction);

            expect(settingsSpy).not.toHaveBeenCalled();
        });

        it("should show an error message if the module is disabled in the guild", async () => {
            settings.enabled = false;
            const createSpy = vi.spyOn(interaction, "createMessage");

            await event.execute(interaction);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("Requests are currently disabled for this guild."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should show an error message if the guild has not configured a channel for requests", async () => {
            settings.channelID = null;
            const createSpy = vi.spyOn(interaction, "createMessage");

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
                custom_id: "post_specific_request",
                values: ["2"]
            });
            const response = new MessageComponentInteraction(data, event.client, vi.fn());
            const editSpy = vi.spyOn(response, "editParent");

            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
            vi.spyOn(event.module.requests, "getAvailableByUser").mockResolvedValue([mockRequest]);

            await event.execute(interaction);

            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith({
                components: [],
                content: expect.stringContaining("Failed to find the request you're looking for.")
            });
        });

        it("should show an error message if the compensation is below the minimum", async () => {
            settings.minCompensation = 1000;

            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "post_specific_request",
                values: ["1"]
            });
            const response = new MessageComponentInteraction(data, event.client, vi.fn());
            const editSpy = vi.spyOn(response, "editParent");

            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
            vi.spyOn(event.module.requests, "getAvailableByUser").mockResolvedValue([mockRequest]);
            vi.spyOn(event.module.requestMessages, "getLatest").mockResolvedValue(null);

            await event.execute(interaction);

            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith({
                components: [],
                content: expect.stringContaining("The compensation must be at least $1000.")
            });
        });

        it("should show an error message if the request is still on cooldown", async () => {
            vi.useFakeTimers().setSystemTime(1441827607);

            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "post_specific_request",
                values: ["1"]
            });
            const response = new MessageComponentInteraction(data, event.client, vi.fn());
            const editSpy = vi.spyOn(response, "editParent");

            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
            vi.spyOn(event.module.requests, "getAvailableByUser").mockResolvedValue([mockRequest]);
            vi.spyOn(event.module.requestMessages, "getLatest").mockResolvedValue({
                messageID: "91256340920236565",
                guildID: "68239102456844360",
                requestID: 1
            });

            await event.execute(interaction);

            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith({
                components: [],
                content: expect.stringContaining("You can post again <t:1441914007:R>.")
            });
        });

        it("should show a timeout message if the user does not select a request", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);
            vi.spyOn(event.module.requests, "getAvailableByUser").mockResolvedValue([mockRequest]);
            const editSpy = vi.spyOn(interaction, "editParent");

            await event.execute(interaction);

            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith(timeoutContent);
        });
    });
});
