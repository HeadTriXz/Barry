import { type RequestsSettings, RequestStatus } from "@prisma/client";

import { ButtonStyle, ComponentType, MessageFlags } from "@discordjs/core";
import {
    MessageComponentInteraction,
    ModalSubmitInteraction,
    UpdatableInteraction
} from "@barry/core";
import {
    createMockMessageComponentInteraction,
    createMockModalSubmitInteraction,
    mockChannel,
    mockMessage,
    mockUser
} from "@barry/testing";
import { retryComponents, timeoutContent } from "../../../../../src/modules/marketplace/constants.js";

import { DiscordAPIError } from "@discordjs/rest";
import { RequestEditor } from "../../../../../src/modules/marketplace/dependencies/requests/editor/RequestEditor.js";
import { createMockApplication } from "../../../../mocks/application.js";
import { mockRequest } from "../mocks/request.js";

import RequestsModule from "../../../../../src/modules/marketplace/dependencies/requests/index.js";
import * as utils from "../../../../../src/modules/marketplace/utils.js";

describe("RequestEditor", () => {
    let interaction: UpdatableInteraction;
    let module: RequestsModule;
    let settings: RequestsSettings;

    beforeEach(() => {
        const client = createMockApplication();
        module = new RequestsModule(client);

        const data = createMockModalSubmitInteraction();
        interaction = new UpdatableInteraction(data, client, vi.fn());
        settings = {
            channelID: "48527482987641760",
            enabled: true,
            guildID: "68239102456844360",
            lastMessageID: null,
            minCompensation: 50
        };

        vi.spyOn(client.api.users, "createDM").mockResolvedValue({ ...mockChannel, position: 0 });
        vi.spyOn(client.api.channels, "createMessage").mockResolvedValue(mockMessage);
        vi.spyOn(client.api.channels, "editMessage").mockResolvedValue(mockMessage);
        vi.spyOn(interaction, "editOriginalMessage").mockResolvedValue(mockMessage);
        vi.spyOn(module.requests, "upsert").mockResolvedValue(mockRequest);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("editAttachments", () => {
        let error: Error;

        beforeEach(() => {
            const response = {
                code: 50007,
                message: "Cannot send messages to this user"
            };

            error = new DiscordAPIError(response, 50007, 200, "GET", "", {});
        });

        it("should overwrite the attachments of the request if the response contains attachments", async () => {
            vi.spyOn(module.client, "awaitMessage").mockResolvedValue({
                ...mockMessage,
                attachments: [
                    {
                        content_type: "image/png",
                        filename: "image.png",
                        id: "0",
                        proxy_url: "https://example.com/image.png",
                        size: 1024,
                        url: "https://example.com/image.png"
                    },
                    {
                        content_type: "image/png",
                        filename: "another-image.png",
                        id: "1",
                        proxy_url: "https://example.com/another-image.png",
                        size: 1024,
                        url: "https://example.com/another-image.png"
                    },
                    {
                        content_type: "text/plain",
                        filename: "passwords.txt",
                        id: "2",
                        proxy_url: "https://example.com/passwords.txt",
                        size: 1024,
                        url: "https://example.com/passwords.txt"
                    }
                ]
            });

            const editor = new RequestEditor(module, settings, true, mockRequest);
            editor.showPreview = vi.fn();

            await editor.editAttachments(interaction, mockChannel.id, true);

            expect(module.requests.upsert).toHaveBeenCalledOnce();
            expect(module.requests.upsert).toHaveBeenCalledWith(mockUser.id, {
                attachments: {
                    create: [
                        {
                            contentType: "image/png",
                            name: "image.png",
                            url: "https://example.com/image.png"
                        },
                        {
                            contentType: "image/png",
                            name: "another-image.png",
                            url: "https://example.com/another-image.png"
                        },
                        {
                            contentType: "text/plain",
                            name: "passwords.txt",
                            url: "https://example.com/passwords.txt"
                        }
                    ]
                }
            }, mockRequest.id);
        });

        it("should update the draft status if the request is being created", async () => {
            vi.spyOn(module.client, "awaitMessage").mockResolvedValue({
                ...mockMessage,
                attachments: [{
                    content_type: "image/png",
                    filename: "image.png",
                    id: "0",
                    proxy_url: "https://example.com/image.png",
                    size: 1024,
                    url: "https://example.com/image.png"
                }]
            });

            const editor = new RequestEditor(module, settings, false, mockRequest);
            editor.showPreview = vi.fn();

            await editor.editAttachments(interaction, mockChannel.id, true);

            expect(module.requests.upsert).toHaveBeenCalledOnce();
            expect(module.requests.upsert).toHaveBeenCalledWith(mockUser.id, {
                attachments: {
                    create: [{
                        contentType: "image/png",
                        name: "image.png",
                        url: "https://example.com/image.png"
                    }]
                },
                status: RequestStatus.DraftPreview
            }, mockRequest.id);
        });

        it("should send an error message if the DMs are disabled", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);
            vi.spyOn(module.client.api.channels, "createMessage").mockRejectedValue(error);

            const editSpy = vi.spyOn(interaction, "editParent");
            const editor = new RequestEditor(module, settings, false, mockRequest);
            editor.showPreview = vi.fn();

            await editor.editAttachments(interaction, mockChannel.id, true);

            expect(editSpy).toHaveBeenCalledTimes(2);
            expect(editSpy).toHaveBeenCalledWith({
                components: retryComponents,
                content: expect.stringContaining("I'm unable to send you a direct message. Please make sure you have your DMs enabled.")
            });
            expect(module.requests.upsert).not.toHaveBeenCalled();
        });

        it("should correctly handle the 'Retry' button when DMs are disabled", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "retry"
            });

            vi.spyOn(module.client, "awaitMessage").mockResolvedValue({
                ...mockMessage,
                attachments: [{
                    content_type: "image/png",
                    filename: "image.png",
                    id: "0",
                    proxy_url: "https://example.com/image.png",
                    size: 1024,
                    url: "https://example.com/image.png"
                }]
            });
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(
                new MessageComponentInteraction(data, module.client, vi.fn())
            );
            vi.spyOn(module.client.api.channels, "createMessage")
                .mockRejectedValueOnce(error)
                .mockResolvedValue(mockMessage);

            const editor = new RequestEditor(module, settings, false, mockRequest);
            const attachmentsSpy = vi.spyOn(editor, "editAttachments");
            editor.showPreview = vi.fn();

            await editor.editAttachments(interaction, mockChannel.id, true);

            expect(attachmentsSpy).toHaveBeenCalledTimes(2);
            expect(module.requests.upsert).toHaveBeenCalledOnce();
            expect(module.requests.upsert).toHaveBeenCalledWith(mockUser.id, {
                attachments: {
                    create: [{
                        contentType: "image/png",
                        name: "image.png",
                        url: "https://example.com/image.png"
                    }]
                },
                status: RequestStatus.DraftPreview
            }, mockRequest.id);
        });

        it("should correctly handle the 'Continue' button when DMs are disabled", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "continue"
            });

            vi.spyOn(module.client.api.channels, "createMessage").mockRejectedValueOnce(error);
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(
                new MessageComponentInteraction(data, module.client, vi.fn())
            );

            const editor = new RequestEditor(module, settings, false, mockRequest);
            editor.showPreview = vi.fn();

            await editor.editAttachments(interaction, mockChannel.id, true);

            expect(module.requests.upsert).toHaveBeenCalledOnce();
            expect(module.requests.upsert).toHaveBeenCalledWith(mockUser.id, {
                status: RequestStatus.DraftPreview
            }, mockRequest.id);
        });

        it("should send an error message if the message does not contain images", async () => {
            vi.spyOn(module.client, "awaitMessage").mockResolvedValue(mockMessage);
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

            const createSpy = vi.spyOn(module.client.api.channels, "createMessage");
            const editor = new RequestEditor(module, settings, false, mockRequest);
            editor.showPreview = vi.fn();

            await editor.editAttachments(interaction, mockChannel.id, true);

            expect(createSpy).toHaveBeenCalledTimes(2);
            expect(createSpy).toHaveBeenCalledWith(mockChannel.id, {
                components: retryComponents,
                content: expect.stringContaining("There are no attachments in that message.")
            });
            expect(module.requests.upsert).not.toHaveBeenCalled();
        });

        it("should show a 'Remove All' button if the user is editing their request", async () => {
            vi.spyOn(module.client, "awaitMessage").mockResolvedValue(mockMessage);
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

            const createSpy = vi.spyOn(module.client.api.channels, "createMessage");
            const editor = new RequestEditor(module, settings, true, mockRequest);
            editor.showPreview = vi.fn();

            await editor.editAttachments(interaction, mockChannel.id, true);

            expect(createSpy).toHaveBeenCalledTimes(2);
            expect(createSpy).toHaveBeenCalledWith(mockChannel.id, {
                components: [{
                    components: [
                        ...retryComponents[0].components,
                        {
                            custom_id: "clear",
                            label: "Remove All",
                            style: ButtonStyle.Danger,
                            type: ComponentType.Button
                        }
                    ],
                    type: ComponentType.ActionRow
                }],
                content: expect.stringContaining("There are no attachments in that message.")
            });
            expect(module.requests.upsert).not.toHaveBeenCalled();
        });

        it("should correctly handle the 'Retry' button when the message does not contain images", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "retry"
            });

            vi.spyOn(module.client, "awaitMessage")
                .mockResolvedValueOnce(mockMessage)
                .mockResolvedValue({
                    ...mockMessage,
                    attachments: [{
                        content_type: "image/png",
                        filename: "image.png",
                        id: "0",
                        proxy_url: "https://example.com/image.png",
                        size: 1024,
                        url: "https://example.com/image.png"
                    }]
                });
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(
                new MessageComponentInteraction(data, module.client, vi.fn())
            );

            const editor = new RequestEditor(module, settings, false, mockRequest);
            editor.showPreview = vi.fn();

            await editor.editAttachments(interaction, mockChannel.id, true);

            expect(module.requests.upsert).toHaveBeenCalledOnce();
            expect(module.requests.upsert).toHaveBeenCalledWith(mockUser.id, {
                attachments: {
                    create: [{
                        contentType: "image/png",
                        name: "image.png",
                        url: "https://example.com/image.png"
                    }]
                },
                status: RequestStatus.DraftPreview
            }, mockRequest.id);
        });

        it("should correctly handle the 'Continue' button when the message does not contain images", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "continue"
            });

            vi.spyOn(module.client, "awaitMessage").mockResolvedValueOnce(mockMessage);
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(
                new MessageComponentInteraction(data, module.client, vi.fn())
            );

            const editor = new RequestEditor(module, settings, false, mockRequest);
            editor.showPreview = vi.fn();

            await editor.editAttachments(interaction, mockChannel.id, true);

            expect(module.requests.upsert).toHaveBeenCalledOnce();
            expect(module.requests.upsert).toHaveBeenCalledWith(mockUser.id, {
                status: RequestStatus.DraftPreview
            }, mockRequest.id);
        });

        it("should correctly handle the 'Remove All' button when the message does not contain images", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "clear"
            });

            vi.spyOn(module.client, "awaitMessage").mockResolvedValueOnce(mockMessage);
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(
                new MessageComponentInteraction(data, module.client, vi.fn())
            );

            const editor = new RequestEditor(module, settings, false, mockRequest);
            editor.showPreview = vi.fn();

            await editor.editAttachments(interaction, mockChannel.id, true);

            expect(module.requests.upsert).toHaveBeenCalledOnce();
            expect(module.requests.upsert).toHaveBeenCalledWith(mockUser.id, {
                attachments: { create: [] },
                status: RequestStatus.DraftPreview
            }, mockRequest.id);
        });

        it("should default the content type to 'text/plain' if it is not set", async () => {
            vi.spyOn(module.client, "awaitMessage").mockResolvedValue({
                ...mockMessage,
                attachments: [{
                    filename: "passwords.txt",
                    id: "2",
                    proxy_url: "https://example.com/passwords.txt",
                    size: 1024,
                    url: "https://example.com/passwords.txt"
                }]
            });

            const editor = new RequestEditor(module, settings, true, mockRequest);
            editor.showPreview = vi.fn();

            await editor.editAttachments(interaction, mockChannel.id, true);

            expect(module.requests.upsert).toHaveBeenCalledOnce();
            expect(module.requests.upsert).toHaveBeenCalledWith(mockUser.id, {
                attachments: {
                    create: [{
                        contentType: "text/plain",
                        name: "passwords.txt",
                        url: "https://example.com/passwords.txt"
                    }]
                }
            }, mockRequest.id);
        });

        it("should show a timeout message if the user did not respond", async () => {
            vi.spyOn(module.client, "awaitMessage").mockResolvedValue(undefined);

            const createSpy = vi.spyOn(module.client.api.channels, "createMessage");
            const editor = new RequestEditor(module, settings, false, mockRequest);
            editor.showPreview = vi.fn();

            await editor.editAttachments(interaction, mockChannel.id, true);

            expect(module.requests.upsert).not.toHaveBeenCalled();
            expect(createSpy).toHaveBeenCalledTimes(2);
            expect(createSpy).toHaveBeenCalledWith(mockChannel.id, timeoutContent);
        });
    });

    describe("editContact", () => {
        it("should update the contact information of the request if the interaction is valid", async () => {
            const data = createMockModalSubmitInteraction({
                components: [{
                    components: [{
                        custom_id: "contact",
                        type: ComponentType.TextInput,
                        value: "Send me a direct message!"
                    }],
                    type: ComponentType.ActionRow
                }],
                custom_id: `${Date.now()}_create_request_2`
            });

            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(
                new ModalSubmitInteraction(data, module.client, vi.fn())
            );

            const editor = new RequestEditor(module, settings, true, mockRequest);
            editor.next = vi.fn();

            await editor.editContact(interaction);

            expect(module.requests.upsert).toHaveBeenCalledOnce();
            expect(module.requests.upsert).toHaveBeenCalledWith(mockUser.id, {
                contact: "Send me a direct message!"
            }, mockRequest.id);
        });

        it("should update the draft status if the request is being created", async () => {
            const data = createMockModalSubmitInteraction({
                components: [{
                    components: [{
                        custom_id: "contact",
                        type: ComponentType.TextInput,
                        value: "Send me a direct message!"
                    }],
                    type: ComponentType.ActionRow
                }],
                custom_id: `${Date.now()}_create_request_2`
            });

            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(
                new ModalSubmitInteraction(data, module.client, vi.fn())
            );

            const editor = new RequestEditor(module, settings, false, mockRequest);
            editor.next = vi.fn();

            await editor.editContact(interaction);

            expect(module.requests.upsert).toHaveBeenCalledOnce();
            expect(module.requests.upsert).toHaveBeenCalledWith(mockUser.id, {
                contact: "Send me a direct message!",
                status: RequestStatus.DraftAttachments
            }, mockRequest.id);
        });

        it("should go to the next step if the request got updated successfully", async () => {
            const data = createMockModalSubmitInteraction({
                components: [{
                    components: [{
                        custom_id: "contact",
                        type: ComponentType.TextInput,
                        value: "Send me a direct message!"
                    }],
                    type: ComponentType.ActionRow
                }],
                custom_id: `${Date.now()}_create_request_2`
            });

            const response = new ModalSubmitInteraction(data, module.client, vi.fn());
            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(response);

            const editor = new RequestEditor(module, settings, false, mockRequest);
            editor.next = vi.fn();

            await editor.editContact(interaction);

            expect(module.requests.upsert).toHaveBeenCalledOnce();
            expect(module.requests.upsert).toHaveBeenCalledWith(mockUser.id, {
                contact: "Send me a direct message!",
                status: RequestStatus.DraftAttachments
            }, mockRequest.id);
            expect(editor.next).toHaveBeenCalledOnce();
            expect(editor.next).toHaveBeenCalledWith(response);
        });

        it("should set the contact information to 'null' if left empty", async () => {
            const data = createMockModalSubmitInteraction({
                components: [{
                    components: [{
                        custom_id: "contact",
                        type: ComponentType.TextInput,
                        value: ""
                    }],
                    type: ComponentType.ActionRow
                }],
                custom_id: `${Date.now()}_create_request_2`
            });

            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(
                new ModalSubmitInteraction(data, module.client, vi.fn())
            );

            const editor = new RequestEditor(module, settings, false, mockRequest);
            editor.next = vi.fn();

            await editor.editContact(interaction);

            expect(module.requests.upsert).toHaveBeenCalledOnce();
            expect(module.requests.upsert).toHaveBeenCalledWith(mockUser.id, {
                contact: null,
                status: RequestStatus.DraftAttachments
            }, mockRequest.id);
        });

        it("should show a timeout message if the user did not respond", async () => {
            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(undefined);

            const editSpy = vi.spyOn(interaction, "editParent");
            const editor = new RequestEditor(module, settings, false, mockRequest);

            await editor.editContact(interaction);

            expect(module.requests.upsert).not.toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith(timeoutContent);
        });

        it("should show an error if the contact information contains an invite link", async () => {
            const data = createMockModalSubmitInteraction({
                components: [{
                    components: [{
                        custom_id: "contact",
                        type: ComponentType.TextInput,
                        value: "discord.gg/invite"
                    }],
                    type: ComponentType.ActionRow
                }],
                custom_id: `${Date.now()}_create_request_2`
            });

            const response = new ModalSubmitInteraction(data, module.client, vi.fn());
            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(response);

            const editSpy = vi.spyOn(response, "editParent");
            const editor = new RequestEditor(module, settings, false, mockRequest);

            await editor.editContact(interaction);

            expect(module.requests.upsert).not.toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("Your request may not contain invite links."),
                flags: MessageFlags.Ephemeral
            });
        });
    });

    describe("editRequest", () => {
        let continueResponse: MessageComponentInteraction;
        let response: ModalSubmitInteraction;

        beforeEach(() => {
            vi.useFakeTimers().setSystemTime("2023-01-01");

            const data = createMockModalSubmitInteraction({
                components: [
                    {
                        components: [{
                            custom_id: "title",
                            type: ComponentType.TextInput,
                            value: "Full-Time Software Engineer"
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "description",
                            type: ComponentType.TextInput,
                            value: "Hello World!"
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "compensation",
                            type: ComponentType.TextInput,
                            value: "$4200 / month"
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "location",
                            type: ComponentType.TextInput,
                            value: "Remote"
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "deadline",
                            type: ComponentType.TextInput,
                            value: "Next week"
                        }],
                        type: ComponentType.ActionRow
                    }
                ],
                custom_id: `${Date.now()}_create_request_1`
            });

            const continueData = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "continue"
            });

            continueResponse = new MessageComponentInteraction(continueData, module.client, vi.fn());
            response = new ModalSubmitInteraction(data, module.client, vi.fn());
            response.editOriginalMessage = vi.fn();

            vi.spyOn(module.requests, "upsert").mockResolvedValue(mockRequest);
            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(response);
            vi.spyOn(response, "awaitMessageComponent").mockResolvedValue(continueResponse);
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it("should update the request with the correct data if the interaction is valid", async () => {
            const editor = new RequestEditor(module, settings, true, mockRequest);
            editor.next = vi.fn();

            await editor.editRequest(interaction);

            expect(module.requests.upsert).toHaveBeenCalledOnce();
            expect(module.requests.upsert).toHaveBeenCalledWith(mockUser.id, {
                compensation: "$4200 / month",
                deadline: "Next week",
                description: "Hello World!",
                location: "Remote",
                title: "Full-Time Software Engineer"
            }, mockRequest.id);
        });

        it("should update the draft status if the request is being created", async () => {
            const editor = new RequestEditor(module, settings, false, mockRequest);
            editor.next = vi.fn();

            await editor.editRequest(interaction);

            expect(module.requests.upsert).toHaveBeenCalledOnce();
            expect(module.requests.upsert).toHaveBeenCalledWith(mockUser.id, {
                compensation: "$4200 / month",
                deadline: "Next week",
                description: "Hello World!",
                location: "Remote",
                status: RequestStatus.DraftContact,
                title: "Full-Time Software Engineer"
            }, mockRequest.id);
        });

        it("should go to the next step if the request got updated successfully", async () => {
            const editor = new RequestEditor(module, settings, false, mockRequest);
            editor.next = vi.fn();

            await editor.editRequest(interaction);

            expect(editor.next).toHaveBeenCalledOnce();
            expect(editor.next).toHaveBeenCalledWith(continueResponse);
        });

        it("should update the request with the correct data without optional fields", async () => {
            response.data.components[3].components[0].value = "";
            response.data.components[4].components[0].value = "";
            response.values.location = "";
            response.values.deadline = "";

            const editor = new RequestEditor(module, settings, false, mockRequest);
            editor.next = vi.fn();

            await editor.editRequest(interaction);

            expect(module.requests.upsert).toHaveBeenCalledOnce();
            expect(module.requests.upsert).toHaveBeenCalledWith(mockUser.id, {
                compensation: "$4200 / month",
                deadline: null,
                description: "Hello World!",
                location: null,
                status: RequestStatus.DraftContact,
                title: "Full-Time Software Engineer"
            }, mockRequest.id);
        });

        it("should show an error message if the request contains an invite", async () => {
            response.data.components[1].components[0].value = "discord.gg/invite";
            response.values.description = "discord.gg/invite";

            const editSpy = vi.spyOn(response, "editParent");
            const editor = new RequestEditor(module, settings, false, mockRequest);
            editor.next = vi.fn();

            await editor.editRequest(interaction);

            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("Your request may not contain invite links."),
                flags: MessageFlags.Ephemeral
            });
            expect(module.requests.upsert).not.toHaveBeenCalled();
        });

        it("should show an error message if the compensation is not valid", async () => {
            vi.spyOn(module, "isValidCompensation").mockReturnValueOnce(false);

            const editSpy = vi.spyOn(response, "editParent");
            const editor = new RequestEditor(module, settings, false, mockRequest);
            editor.next = vi.fn();

            await editor.editRequest(interaction);

            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("The compensation must be at least $50."),
                flags: MessageFlags.Ephemeral
            });
            expect(module.requests.upsert).not.toHaveBeenCalled();
        });

        it("should show a timeout message if the user did not respond to the modal", async () => {
            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(undefined);

            const editSpy = vi.spyOn(interaction, "editParent");
            const editor = new RequestEditor(module, settings, false, mockRequest);
            editor.next = vi.fn();

            await editor.editRequest(interaction);

            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith(timeoutContent);
            expect(module.requests.upsert).not.toHaveBeenCalled();
        });

        it("should show a timeout message if the user did not click the continue button", async () => {
            vi.spyOn(response, "awaitMessageComponent").mockResolvedValue(undefined);

            const editSpy = vi.spyOn(response, "editParent");
            const editor = new RequestEditor(module, settings, false, mockRequest);
            editor.next = vi.fn();

            await editor.editRequest(interaction);

            expect(editSpy).toHaveBeenCalledTimes(2);
            expect(editSpy).toHaveBeenCalledWith(timeoutContent);
            expect(module.requests.upsert).toHaveBeenCalledOnce();
        });
    });

    describe("next", () => {
        it("should show the preview if they are editing their request", async () => {
            const editor = new RequestEditor(module, settings, true, mockRequest);
            editor.showPreview = vi.fn();

            await editor.next(interaction);

            expect(editor.showPreview).toHaveBeenCalledOnce();
            expect(editor.showPreview).toHaveBeenCalledWith(interaction);
        });

        it("should edit the attachments if the status is set to 'DraftAttachments'", async () => {
            const request = { ...mockRequest, status: RequestStatus.DraftAttachments };
            const editor = new RequestEditor(module, settings, false, request);
            editor.promptAttachments = vi.fn();

            await editor.next(interaction);

            expect(editor.promptAttachments).toHaveBeenCalledOnce();
            expect(editor.promptAttachments).toHaveBeenCalledWith(interaction);
        });

        it("should edit the contact information if the status is set to 'DraftContact'", async () => {
            const request = { ...mockRequest, status: RequestStatus.DraftContact };
            const editor = new RequestEditor(module, settings, false, request);
            editor.editContact = vi.fn();

            await editor.next(interaction);

            expect(editor.editContact).toHaveBeenCalledOnce();
            expect(editor.editContact).toHaveBeenCalledWith(interaction);
        });

        it("should show the preview if the status is set to 'DraftPreview'", async () => {
            const request = { ...mockRequest, status: RequestStatus.DraftPreview };
            const editor = new RequestEditor(module, settings, false, request);
            editor.showPreview = vi.fn();

            await editor.next(interaction);

            expect(editor.showPreview).toHaveBeenCalledOnce();
            expect(editor.showPreview).toHaveBeenCalledWith(interaction);
        });

        it("should start creating a request if no draft exists yet", async () => {
            const editor = new RequestEditor(module, settings, false);
            editor.editRequest = vi.fn();

            await editor.next(interaction);

            expect(editor.editRequest).toHaveBeenCalledOnce();
            expect(editor.editRequest).toHaveBeenCalledWith(interaction);
        });
    });

    describe("promptAttachments", () => {
        it("should start editing the attachments if the user clicks the 'Yes' button", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "yes"
            });

            const response = new MessageComponentInteraction(data, module.client, vi.fn());
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);

            const editor = new RequestEditor(module, settings, false, mockRequest);
            editor.editAttachments = vi.fn();

            await editor.promptAttachments(interaction);

            expect(editor.editAttachments).toHaveBeenCalledOnce();
            expect(editor.editAttachments).toHaveBeenCalledWith(response, mockChannel.id, true);
        });

        it("should continue to the preview if the user clicks the 'No' button", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "no"
            });

            const response = new MessageComponentInteraction(data, module.client, vi.fn());
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);

            const editor = new RequestEditor(module, settings, false, mockRequest);
            editor.next = vi.fn();

            await editor.promptAttachments(interaction);

            expect(editor.next).toHaveBeenCalledOnce();
            expect(editor.next).toHaveBeenCalledWith(response);
            expect(module.requests.upsert).toHaveBeenCalledOnce();
            expect(module.requests.upsert).toHaveBeenCalledWith(mockUser.id, {
                status: RequestStatus.DraftPreview
            }, mockRequest.id);
        });

        it("should show a timeout message if the user did not respond", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

            const editSpy = vi.spyOn(interaction, "editParent");
            const editor = new RequestEditor(module, settings, false, mockRequest);

            await editor.promptAttachments(interaction);

            expect(module.requests.upsert).not.toHaveBeenCalled();
            expect(editSpy).toHaveBeenCalledTimes(2);
            expect(editSpy).toHaveBeenCalledWith(timeoutContent);
        });
    });

    describe("showPreview", () => {
        it("should show the preview of the request", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

            const editSpy = vi.spyOn(interaction, "editOriginalMessage");
            const editor = new RequestEditor(module, settings, false, mockRequest);

            await editor.showPreview(interaction);

            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith({
                components: [{
                    components: [
                        {
                            custom_id: "publish",
                            label: "Publish Request",
                            style: ButtonStyle.Success,
                            type: ComponentType.Button
                        },
                        {
                            custom_id: "edit",
                            label: "Edit Request",
                            style: ButtonStyle.Secondary,
                            type: ComponentType.Button
                        },
                        {
                            custom_id: "contact",
                            label: "Preview Contact",
                            style: ButtonStyle.Secondary,
                            type: ComponentType.Button
                        }
                    ],
                    type: ComponentType.ActionRow
                }],
                content: "### Here's a preview of your request:\n"
                    + "Choose one of the following options:\n"
                    + "- To make changes and edit your request, press the **Edit Request** button.\n"
                    + "- To publish your request, press the **Publish Request** button.",
                embeds: [{
                    color: expect.any(Number),
                    description: expect.any(String),
                    fields: expect.any(Array),
                    thumbnail: {
                        url: expect.any(String)
                    },
                    title: mockRequest.title
                }]
            });
        });

        it("should create a new message if the preview should be shown in DMs", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

            const createSpy = vi.spyOn(module.client.api.channels, "createMessage");
            const editSpy = vi.spyOn(interaction, "editOriginalMessage");
            const editor = new RequestEditor(module, settings, false, mockRequest);

            await editor.showPreview(interaction, mockChannel.id);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith(mockChannel.id, {
                components: expect.any(Array),
                content: "### Here's a preview of your request:\n"
                    + "Choose one of the following options:\n"
                    + "- To make changes and edit your request, press the **Edit Request** button.\n"
                    + "- To publish your request, press the **Publish Request** button.",
                embeds: [{
                    color: expect.any(Number),
                    description: expect.any(String),
                    fields: expect.any(Array),
                    thumbnail: {
                        url: expect.any(String)
                    },
                    title: mockRequest.title
                }]
            });
            expect(editSpy).not.toHaveBeenCalled();
        });

        it("should fetch the user's draft if the no request is cached yet", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

            const getSpy = vi.spyOn(module.requests, "getDraft").mockResolvedValue(mockRequest);
            const editor = new RequestEditor(module, settings, false);

            await editor.showPreview(interaction);

            expect(getSpy).toHaveBeenCalledOnce();
            expect(getSpy).toHaveBeenCalledWith(mockUser.id);
        });

        it("should show an error message if the request does not exist", async () => {
            vi.spyOn(module.requests, "getDraft").mockResolvedValue(null);

            const editSpy = vi.spyOn(interaction, "editParent");
            const editor = new RequestEditor(module, settings, false);

            await editor.showPreview(interaction);

            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("Failed to find the request you're looking for."),
                flags: MessageFlags.Ephemeral
            });
        });
    });

    describe("#awaitPreviewResponse", () => {
        it("should show a timeout message if the user did not respond", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

            const editSpy = vi.spyOn(interaction, "editParent");
            const editor = new RequestEditor(module, settings, false, mockRequest);

            await editor.showPreview(interaction);

            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith(timeoutContent);
        });

        describe("Publish", () => {
            it("should post the request if the user is creating a new request", async () => {
                const data = createMockMessageComponentInteraction({
                    component_type: ComponentType.Button,
                    custom_id: "publish"
                });

                vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(
                    new MessageComponentInteraction(data, module.client, vi.fn())
                );

                const editor = new RequestEditor(module, settings, false, mockRequest);
                module.postRequest = vi.fn();

                await editor.showPreview(interaction);

                expect(module.postRequest).toHaveBeenCalledOnce();
                expect(module.postRequest).toHaveBeenCalledWith(interaction.user, mockRequest, settings);
            });

            it("should edit the latest request message if the user is editing their request", async () => {
                const data = createMockMessageComponentInteraction({
                    component_type: ComponentType.Button,
                    custom_id: "publish"
                });

                vi.spyOn(module.requestMessages, "getLatest").mockResolvedValue({
                    guildID: "68239102456844360",
                    messageID: mockMessage.id,
                    requestID: mockRequest.id
                });
                vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(
                    new MessageComponentInteraction(data, module.client, vi.fn())
                );

                const editSpy = vi.spyOn(module.client.api.channels, "editMessage");
                const editor = new RequestEditor(module, settings, true, mockRequest);

                await editor.showPreview(interaction);

                expect(editSpy).toHaveBeenCalledOnce();
                expect(editSpy).toHaveBeenCalledWith(settings.channelID, mockMessage.id, expect.any(Object));
            });

            it("should post the request if the user is editing their request and has no existing request messages", async () => {
                const data = createMockMessageComponentInteraction({
                    component_type: ComponentType.Button,
                    custom_id: "publish"
                });

                vi.spyOn(module.requestMessages, "getLatest").mockResolvedValue(null);
                vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(
                    new MessageComponentInteraction(data, module.client, vi.fn())
                );

                const editor = new RequestEditor(module, settings, true, mockRequest);
                module.postRequest = vi.fn();

                await editor.showPreview(interaction);

                expect(module.postRequest).toHaveBeenCalledOnce();
                expect(module.postRequest).toHaveBeenCalledWith(interaction.user, mockRequest, settings);
            });

            it("should show an error message if the guild has not configured a channel for requests", async () => {
                const data = createMockMessageComponentInteraction({
                    component_type: ComponentType.Button,
                    custom_id: "publish"
                });

                vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(
                    new MessageComponentInteraction(data, module.client, vi.fn())
                );

                const editSpy = vi.spyOn(interaction, "editParent");
                const editor = new RequestEditor(module, settings, true, mockRequest);
                settings.channelID = null;

                await editor.showPreview(interaction);

                expect(editSpy).toHaveBeenCalledOnce();
                expect(editSpy).toHaveBeenCalledWith({
                    content: expect.stringContaining("This guild hasn't setup their channel for requests."),
                    flags: MessageFlags.Ephemeral
                });
            });

            it("should handle errors on editing the latest request message", async () => {
                const data = createMockMessageComponentInteraction({
                    component_type: ComponentType.Button,
                    custom_id: "publish"
                });

                vi.spyOn(module.client.api.channels, "editMessage").mockRejectedValue(new Error());
                vi.spyOn(module.requestMessages, "getLatest").mockResolvedValue({
                    guildID: "68239102456844360",
                    messageID: mockMessage.id,
                    requestID: mockRequest.id
                });
                vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(
                    new MessageComponentInteraction(data, module.client, vi.fn())
                );

                const loggerSpy = vi.spyOn(module.client.logger, "warn");
                const editor = new RequestEditor(module, settings, true, mockRequest);

                await editor.showPreview(interaction);

                expect(loggerSpy).toHaveBeenCalledOnce();
                expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining("Could not edit last message"));
            });
        });

        describe("Edit", () => {
            it("should set the 'isEditing' property to 'true'", async () => {
                const data = createMockMessageComponentInteraction({
                    component_type: ComponentType.Button,
                    custom_id: "edit"
                });

                const response = new MessageComponentInteraction(data, module.client, vi.fn());
                vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
                vi.spyOn(response, "awaitMessageComponent").mockResolvedValue(undefined);
                vi.spyOn(response, "editOriginalMessage").mockResolvedValue(mockMessage);

                const editor = new RequestEditor(module, settings, false, mockRequest);
                await editor.showPreview(interaction);

                expect(editor.isEditing).toBe(true);
            });

            it("should edit the attachments if the user selected 'Attachments'", async () => {
                const data = createMockMessageComponentInteraction({
                    component_type: ComponentType.Button,
                    custom_id: "edit"
                });

                const editData = createMockMessageComponentInteraction({
                    component_type: ComponentType.StringSelect,
                    custom_id: "preview_request_edit",
                    values: ["attachments"]
                });

                const editResponse = new MessageComponentInteraction(editData, module.client, vi.fn());
                const response = new MessageComponentInteraction(data, module.client, vi.fn());

                vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
                vi.spyOn(response, "awaitMessageComponent").mockResolvedValue(editResponse);
                vi.spyOn(response, "editOriginalMessage").mockResolvedValue(mockMessage);

                const editor = new RequestEditor(module, settings, false, mockRequest);
                editor.editAttachments = vi.fn();

                await editor.showPreview(interaction);

                expect(editor.editAttachments).toHaveBeenCalledOnce();
                expect(editor.editAttachments).toHaveBeenCalledWith(editResponse, mockChannel.id, true);
            });

            it("should edit the contact information if the user selected 'Contact'", async () => {
                const data = createMockMessageComponentInteraction({
                    component_type: ComponentType.Button,
                    custom_id: "edit"
                });

                const editData = createMockMessageComponentInteraction({
                    component_type: ComponentType.StringSelect,
                    custom_id: "preview_request_edit",
                    values: ["contact"]
                });

                const editResponse = new MessageComponentInteraction(editData, module.client, vi.fn());
                const response = new MessageComponentInteraction(data, module.client, vi.fn());

                vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
                vi.spyOn(response, "awaitMessageComponent").mockResolvedValue(editResponse);
                vi.spyOn(response, "editOriginalMessage").mockResolvedValue(mockMessage);

                const editor = new RequestEditor(module, settings, false, mockRequest);
                editor.editContact = vi.fn();

                await editor.showPreview(interaction);

                expect(editor.editContact).toHaveBeenCalledOnce();
                expect(editor.editContact).toHaveBeenCalledWith(editResponse);
            });

            it("should edit the request if the user selected 'Request'", async () => {
                const data = createMockMessageComponentInteraction({
                    component_type: ComponentType.Button,
                    custom_id: "edit"
                });

                const editData = createMockMessageComponentInteraction({
                    component_type: ComponentType.StringSelect,
                    custom_id: "preview_request_edit",
                    values: ["request"]
                });

                const editResponse = new MessageComponentInteraction(editData, module.client, vi.fn());
                const response = new MessageComponentInteraction(data, module.client, vi.fn());

                vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
                vi.spyOn(response, "awaitMessageComponent").mockResolvedValue(editResponse);
                vi.spyOn(response, "editOriginalMessage").mockResolvedValue(mockMessage);

                const editor = new RequestEditor(module, settings, false, mockRequest);
                editor.editRequest = vi.fn();

                await editor.showPreview(interaction);

                expect(editor.editRequest).toHaveBeenCalledOnce();
                expect(editor.editRequest).toHaveBeenCalledWith(editResponse);
            });

            it("should show a timeout message if the user did not respond", async () => {
                const data = createMockMessageComponentInteraction({
                    component_type: ComponentType.Button,
                    custom_id: "edit"
                });

                const response = new MessageComponentInteraction(data, module.client, vi.fn());
                const editSpy = vi.spyOn(response, "editParent");

                vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
                vi.spyOn(response, "awaitMessageComponent").mockResolvedValue(undefined);
                vi.spyOn(response, "editOriginalMessage").mockResolvedValue(mockMessage);

                const editor = new RequestEditor(module, settings, false, mockRequest);
                await editor.showPreview(interaction);

                expect(editSpy).toHaveBeenCalledTimes(2);
                expect(editSpy).toHaveBeenCalledWith(timeoutContent);
            });

            it("should not fetch the DM channel if the ID is already known", async () => {
                const data = createMockMessageComponentInteraction({
                    component_type: ComponentType.Button,
                    custom_id: "edit"
                });

                const editData = createMockMessageComponentInteraction({
                    component_type: ComponentType.StringSelect,
                    custom_id: "preview_request_edit",
                    values: ["attachments"]
                });

                const editResponse = new MessageComponentInteraction(editData, module.client, vi.fn());
                const response = new MessageComponentInteraction(data, module.client, vi.fn());
                const dmSpy = vi.spyOn(module.client.api.users, "createDM");

                vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
                vi.spyOn(response, "awaitMessageComponent").mockResolvedValue(editResponse);
                vi.spyOn(response, "editOriginalMessage").mockResolvedValue(mockMessage);

                const editor = new RequestEditor(module, settings, false, mockRequest);
                editor.editAttachments = vi.fn();

                await editor.showPreview(interaction, mockChannel.id);

                expect(dmSpy).not.toHaveBeenCalled();
                expect(editor.editAttachments).toHaveBeenCalledOnce();
                expect(editor.editAttachments).toHaveBeenCalledWith(editResponse, mockChannel.id, true);
            });
        });

        describe("Contact", () => {
            it("should display the contact information", async () => {
                const data = createMockMessageComponentInteraction({
                    component_type: ComponentType.Button,
                    custom_id: "contact"
                });

                const response = new MessageComponentInteraction(data, module.client, vi.fn());

                vi.spyOn(interaction, "awaitMessageComponent")
                    .mockResolvedValueOnce(response)
                    .mockResolvedValue(undefined);
                vi.spyOn(response, "editOriginalMessage").mockResolvedValue(mockMessage);

                const editor = new RequestEditor(module, settings, false, mockRequest);
                const displaySpy = vi.spyOn(utils, "displayContact").mockResolvedValue();

                await editor.showPreview(interaction);

                expect(displaySpy).toHaveBeenCalledOnce();
                expect(displaySpy).toHaveBeenCalledWith(response, mockRequest);
            });

            it("should continue listening for interactions on the preview", async () => {
                const data = createMockMessageComponentInteraction({
                    component_type: ComponentType.Button,
                    custom_id: "contact"
                });

                vi.spyOn(interaction, "awaitMessageComponent")
                    .mockResolvedValueOnce(new MessageComponentInteraction(data, module.client, vi.fn()))
                    .mockResolvedValueOnce(new MessageComponentInteraction(data, module.client, vi.fn()))
                    .mockResolvedValue(undefined);

                const editor = new RequestEditor(module, settings, false, mockRequest);
                const displaySpy = vi.spyOn(utils, "displayContact").mockResolvedValue();

                await editor.showPreview(interaction);

                expect(displaySpy).toHaveBeenCalledTimes(2);
            });
        });
    });
});
