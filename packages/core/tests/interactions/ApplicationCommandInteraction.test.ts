import {
    type API,
    InteractionType,
    ApplicationCommandType
} from "@discordjs/core";

import {
    ApplicationCommandInteraction,
    ApplicationCommandInteractionData,
    ApplicationCommandInteractionDataFactory,
    ChatInputApplicationCommandInteractionData,
    Client,
    MessageApplicationCommandInteractionData,
    UserApplicationCommandInteractionData
} from "../../src/index.js";
import { beforeEach, describe, expect, it } from "vitest";
import {
    createMockApplicationCommandInteraction,
    mockAttachment,
    mockChatInputCommand,
    mockInteractionChannel,
    mockInteractionMember,
    mockMessage,
    mockMessageCommand,
    mockRole,
    mockUser,
    mockUserCommand
} from "@barry/testing";

describe("ApplicationCommandInteraction", () => {
    let client: Client;

    beforeEach(() => {
        client = new Client({
            applicationID: "49072635294295155",
            api: {} as API
        });
    });

    describe("constructor", () => {
        it("should should initialize the data property correctly", () => {
            const data = createMockApplicationCommandInteraction();
            const interaction = new ApplicationCommandInteraction(data, client);

            expect(interaction.type).toBe(InteractionType.ApplicationCommand);
            expect(interaction.data.type).toBe(data.data.type);
            expect(interaction.data.name).toBe(data.data.name);
        });
    });
});

describe("ApplicationCommandInteractionData", () => {
    describe("isChatInput", () => {
        it("should return true when the application command type is CHAT_INPUT", () => {
            const data = new ApplicationCommandInteractionData(mockChatInputCommand);
            expect(data.isChatInput()).toBe(true);
        });

        it("should return false when the application command type is not CHAT_INPUT", () => {
            const data = new ApplicationCommandInteractionData(mockMessageCommand);
            expect(data.isChatInput()).toBe(false);
        });
    });

    describe("isMessage", () => {
        it("should return true when the application command type is MESSAGE", () => {
            const data = new ApplicationCommandInteractionData(mockMessageCommand);
            expect(data.isMessage()).toBe(true);
        });

        it("should return false when the application command type is not MESSAGE", () => {
            const data = new ApplicationCommandInteractionData(mockUserCommand);
            expect(data.isMessage()).toBe(false);
        });
    });

    describe("isUser", () => {
        it("should return true when the application command type is USER", () => {
            const data = new ApplicationCommandInteractionData(mockUserCommand);
            expect(data.isUser()).toBe(true);
        });

        it("should return false when the application command type is not USER", () => {
            const data = new ApplicationCommandInteractionData(mockChatInputCommand);
            expect(data.isUser()).toBe(false);
        });
    });
});

describe("ChatInputApplicationCommandInteractionData", () => {
    describe("constructor", () => {
        it("should initialize the options and resolved properties correctly", () => {
            const data = new ChatInputApplicationCommandInteractionData(mockChatInputCommand);

            expect(data.id).toBe(mockChatInputCommand.id);
            expect(data.name).toBe(mockChatInputCommand.name);
            expect(data.options).toBe(mockChatInputCommand.options);
            expect(data.type).toBe(ApplicationCommandType.ChatInput);

            expect(data.resolved.attachments.get("71272489110250160")).toEqual(mockAttachment);
            expect(data.resolved.channels.get("30527482987641765")).toEqual(mockInteractionChannel);
            expect(data.resolved.members.get("257522665441460225")).toEqual(mockInteractionMember);
            expect(data.resolved.roles.get("68239102456844360")).toEqual(mockRole);
            expect(data.resolved.users.get("257522665441460225")).toEqual(mockUser);
        });
    });
});

describe("MessageApplicationCommandInteractionData", () => {
    describe("constructor", () => {
        it("should initialize the resolved and targetID properties correctly", () => {
            const data = new MessageApplicationCommandInteractionData(mockMessageCommand);

            expect(data.id).toBe(mockMessageCommand.id);
            expect(data.name).toBe(mockMessageCommand.name);
            expect(data.targetID).toBe(mockMessageCommand.target_id);
            expect(data.type).toBe(ApplicationCommandType.Message);
            expect(data.resolved.messages.get("91256340920236565")).toEqual(mockMessage);
        });
    });
});

describe("UserApplicationCommandInteractionData", () => {
    describe("constructor", () => {
        it("should initialize the resolved and targetID properties correctly", () => {
            const data = new UserApplicationCommandInteractionData(mockUserCommand);

            expect(data.id).toBe(mockUserCommand.id);
            expect(data.name).toBe(mockUserCommand.name);
            expect(data.targetID).toBe(mockUserCommand.target_id);
            expect(data.type).toBe(ApplicationCommandType.User);

            expect(data.resolved.members.get("257522665441460225")).toEqual(mockInteractionMember);
            expect(data.resolved.users.get("257522665441460225")).toEqual(mockUser);
        });
    });
});

describe("ApplicationCommandInteractionDataFactory", () => {
    describe("from", () => {
        it("should return the right subclass", () => {
            expect(
                ApplicationCommandInteractionDataFactory.from(mockChatInputCommand)
            ).toBeInstanceOf(ChatInputApplicationCommandInteractionData);

            expect(
                ApplicationCommandInteractionDataFactory.from(mockMessageCommand)
            ).toBeInstanceOf(MessageApplicationCommandInteractionData);

            expect(
                ApplicationCommandInteractionDataFactory.from(mockUserCommand)
            ).toBeInstanceOf(UserApplicationCommandInteractionData);
        });

        it("should return the base class for unknown types", () => {
            const mockUnknownCommand = {
                id: "91256340920236565",
                name: "ping",
                target_id: "257522665441460225",
                type: 26
            };

            const data = ApplicationCommandInteractionDataFactory.from(mockUnknownCommand);
            expect(data).toBeInstanceOf(ApplicationCommandInteractionData);
        });
    });
});
