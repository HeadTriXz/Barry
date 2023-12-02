import { type RequestsSettings, RequestStatus } from "@prisma/client";

import { ComponentType, TextInputStyle } from "@discordjs/core";
import {
    getEditContactContent,
    getEditRequestContent,
    getRequestContent
} from "../../../../../../src/modules/marketplace/dependencies/requests/editor/functions/content.js";
import { mockRequest } from "../../mocks/request.js";
import { mockUser } from "@barry-bot/testing";

describe("Content", () => {
    describe("getEditContactContent", () => {
        afterEach(() => {
            vi.useRealTimers();
        });

        it("should return the correct content for the editContact message", () => {
            vi.useFakeTimers().setSystemTime("2023-01-01");
            const content = getEditContactContent();

            expect(content).toEqual({
                components: [{
                    components: [{
                        custom_id: "contact",
                        label: "How should people reach out to you?",
                        max_length: 100,
                        placeholder: "e.g., 'Send me a direct message', 'Email me at hello@example.com', etc.",
                        required: false,
                        style: TextInputStyle.Short,
                        type: ComponentType.TextInput
                    }],
                    type: ComponentType.ActionRow
                }],
                custom_id: `${Date.now()}_create_request_2`,
                title: "Contact Information"
            });
        });

        it("should set the correct default value if the request is known", () => {
            vi.useFakeTimers().setSystemTime("2023-01-01");
            const content = getEditContactContent(mockRequest);

            expect(content).toEqual({
                components: [{
                    components: [{
                        custom_id: "contact",
                        label: "How should people reach out to you?",
                        max_length: 100,
                        placeholder: "e.g., 'Send me a direct message', 'Email me at hello@example.com', etc.",
                        required: false,
                        style: TextInputStyle.Short,
                        type: ComponentType.TextInput,
                        value: "Send me a direct message"
                    }],
                    type: ComponentType.ActionRow
                }],
                custom_id: `${Date.now()}_create_request_2`,
                title: "Contact Information"
            });
        });
    });

    describe("getEditRequestContent", () => {
        let settings: RequestsSettings;

        beforeEach(() => {
            settings = {
                channelID: "48527482987641760",
                enabled: true,
                guildID: "68239102456844360",
                lastMessageID: null,
                minCompensation: 50
            };
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it("should return the correct content for the editRequest message", () => {
            vi.useFakeTimers().setSystemTime("2023-01-01");
            const content = getEditRequestContent(settings);

            expect(content).toEqual({
                components: [
                    {
                        components: [{
                            custom_id: "title",
                            label: "Job Title",
                            max_length: 50,
                            min_length: 5,
                            placeholder: "e.g. Web Developer, Graphic Designer, etc.",
                            style: TextInputStyle.Short,
                            type: ComponentType.TextInput
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "description",
                            label: "Description",
                            max_length: 1000,
                            min_length: 100,
                            placeholder: "Describe the job you're looking to get done, provide as much detail as possible.",
                            style: TextInputStyle.Paragraph,
                            type: ComponentType.TextInput
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "compensation",
                            label: "Compensation",
                            max_length: 100,
                            placeholder: `e.g. $${settings.minCompensation}, $${settings.minCompensation}/hour, etc.`,
                            style: TextInputStyle.Short,
                            type: ComponentType.TextInput
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "location",
                            label: "Location",
                            max_length: 100,
                            placeholder: "e.g. Remote, San Francisco, etc.",
                            required: false,
                            style: TextInputStyle.Short,
                            type: ComponentType.TextInput
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "deadline",
                            label: "Deadline",
                            max_length: 100,
                            placeholder: "e.g. January 1, 2023",
                            required: false,
                            style: TextInputStyle.Short,
                            type: ComponentType.TextInput
                        }],
                        type: ComponentType.ActionRow
                    }
                ],
                custom_id: `${Date.now()}_create_request_1`,
                title: "Create a request"
            });
        });

        it("should set the correct default values if the request is known", () => {
            vi.useFakeTimers().setSystemTime("2023-01-01");
            const content = getEditRequestContent(settings, mockRequest);

            expect(content).toEqual({
                components: [
                    {
                        components: [{
                            custom_id: "title",
                            label: "Job Title",
                            max_length: 50,
                            min_length: 5,
                            placeholder: "e.g. Web Developer, Graphic Designer, etc.",
                            style: TextInputStyle.Short,
                            type: ComponentType.TextInput,
                            value: mockRequest.title
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "description",
                            label: "Description",
                            max_length: 1000,
                            min_length: 100,
                            placeholder: "Describe the job you're looking to get done, provide as much detail as possible.",
                            style: TextInputStyle.Paragraph,
                            type: ComponentType.TextInput,
                            value: mockRequest.description
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "compensation",
                            label: "Compensation",
                            max_length: 100,
                            placeholder: `e.g. $${settings.minCompensation}, $${settings.minCompensation}/hour, etc.`,
                            style: TextInputStyle.Short,
                            type: ComponentType.TextInput,
                            value: mockRequest.compensation
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "location",
                            label: "Location",
                            max_length: 100,
                            placeholder: "e.g. Remote, San Francisco, etc.",
                            required: false,
                            style: TextInputStyle.Short,
                            type: ComponentType.TextInput,
                            value: mockRequest.location
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "deadline",
                            label: "Deadline",
                            max_length: 100,
                            placeholder: "e.g. January 1, 2023",
                            required: false,
                            style: TextInputStyle.Short,
                            type: ComponentType.TextInput,
                            value: mockRequest.deadline
                        }],
                        type: ComponentType.ActionRow
                    }
                ],
                custom_id: `${Date.now()}_create_request_1`,
                title: "Create a request"
            });
        });
    });

    describe("getRequestContent", () => {
        it("should return the correct content for a request with all fields", () => {
            const content = getRequestContent(mockUser, {
                ...mockRequest,
                attachments: [
                    {
                        contentType: "image/png",
                        id: 1,
                        name: "image.png",
                        requestID: mockRequest.id,
                        url: "https://example.com/image.png"
                    },
                    {
                        contentType: "image/png",
                        id: 2,
                        name: "another-image.png",
                        requestID: mockRequest.id,
                        url: "https://example.com/another-image.png"
                    },
                    {
                        contentType: "text/plain",
                        id: 1,
                        name: "passwords.txt",
                        requestID: mockRequest.id,
                        url: "https://example.com/passwords.txt"
                    }
                ]
            });

            expect(content).toEqual({
                content: `<@${mockUser.id}>`,
                embeds: [{
                    color: expect.any(Number),
                    description: expect.stringContaining(`**Job \`${mockRequest.id}\` posted by <@${mockUser.id}>**\n`),
                    fields: [
                        {
                            name: "Description",
                            value: "Hello world!"
                        },
                        {
                            inline: true,
                            name: "Location",
                            value: "Remote"
                        },
                        {
                            inline: true,
                            name: "Compensation",
                            value: "$100 / hour"
                        },
                        {
                            name: "Deadline",
                            value: "ASAP"
                        },
                        {
                            name: "Attachments",
                            value: "[another-image.png](https://example.com/another-image.png), [passwords.txt](https://example.com/passwords.txt)\n\n`image.png`:"
                        }
                    ],
                    image: {
                        url: "https://example.com/image.png"
                    },
                    thumbnail: {
                        url: `https://cdn.discordapp.com/avatars/${mockUser.id}/${mockUser.avatar}.webp`
                    },
                    title: mockRequest.title
                }]
            });
        });

        it("should return the correct content for a request with no images", () => {
            const content = getRequestContent(mockUser, {
                ...mockRequest,
                attachments: [{
                    contentType: "text/plain",
                    id: 1,
                    name: "passwords.txt",
                    requestID: mockRequest.id,
                    url: "https://example.com/passwords.txt"
                }]
            });

            expect(content).toEqual({
                content: `<@${mockUser.id}>`,
                embeds: [{
                    color: expect.any(Number),
                    description: expect.stringContaining(`**Job \`${mockRequest.id}\` posted by <@${mockUser.id}>**\n`),
                    fields: [
                        {
                            name: "Description",
                            value: "Hello world!"
                        },
                        {
                            inline: true,
                            name: "Location",
                            value: "Remote"
                        },
                        {
                            inline: true,
                            name: "Compensation",
                            value: "$100 / hour"
                        },
                        {
                            name: "Deadline",
                            value: "ASAP"
                        },
                        {
                            name: "Attachments",
                            value: "[passwords.txt](https://example.com/passwords.txt)"
                        }
                    ],
                    thumbnail: {
                        url: `https://cdn.discordapp.com/avatars/${mockUser.id}/${mockUser.avatar}.webp`
                    },
                    title: mockRequest.title
                }]
            });
        });

        it("should show 'Available' if the request is a draft", () => {
            const content = getRequestContent(mockUser, {
                ...mockRequest,
                deadline: null,
                location: null,
                status: RequestStatus.DraftContact
            });

            expect(content).toEqual({
                content: `<@${mockUser.id}>`,
                embeds: [{
                    color: expect.any(Number),
                    description: expect.stringContaining("Available"),
                    fields: [
                        {
                            name: "Description",
                            value: "Hello world!"
                        },
                        {
                            inline: true,
                            name: "Compensation",
                            value: "$100 / hour"
                        }
                    ],
                    thumbnail: {
                        url: `https://cdn.discordapp.com/avatars/${mockUser.id}/${mockUser.avatar}.webp`
                    },
                    title: mockRequest.title
                }]
            });
        });

        it("should return the correct content for a request without optional fields", () => {
            const content = getRequestContent(mockUser, {
                ...mockRequest,
                deadline: null,
                location: null
            });

            expect(content).toEqual({
                content: `<@${mockUser.id}>`,
                embeds: [{
                    color: expect.any(Number),
                    description: expect.stringContaining(`**Job \`${mockRequest.id}\` posted by <@${mockUser.id}>**\n`),
                    fields: [
                        {
                            name: "Description",
                            value: "Hello world!"
                        },
                        {
                            inline: true,
                            name: "Compensation",
                            value: "$100 / hour"
                        }
                    ],
                    thumbnail: {
                        url: `https://cdn.discordapp.com/avatars/${mockUser.id}/${mockUser.avatar}.webp`
                    },
                    title: mockRequest.title
                }]
            });
        });
    });
});
