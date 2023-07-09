import {
    type APIApplicationCommandAutocompleteInteraction,
    type APIChatInputApplicationCommandInteractionData,
    type APIMessageApplicationCommandInteractionData,
    type APIUserApplicationCommandInteractionData,
    ApplicationCommandOptionType,
    ApplicationCommandType
} from "@discordjs/core";

import { mockResolvedData } from "../common.js";

/**
 * Represents a chat input application command.
 */
export const mockChatInputCommand: APIChatInputApplicationCommandInteractionData = {
    id: "91256340920236565",
    name: "ping",
    resolved: {
        attachments: mockResolvedData.attachments,
        channels: mockResolvedData.channels,
        members: mockResolvedData.members,
        roles: mockResolvedData.roles,
        users: mockResolvedData.users
    },
    type: ApplicationCommandType.ChatInput
};

/**
 * Represents autocomplete interaction data.
 */
export const mockAutocompleteCommand: APIApplicationCommandAutocompleteInteraction["data"] = {
    ...mockChatInputCommand,
    name: "bar",
    options: [
        {
            name: "foo",
            type: ApplicationCommandOptionType.String,
            value: "Hello World"
        },
        {
            focused: true,
            name: "bar",
            type: ApplicationCommandOptionType.Integer,
            value: 42
        }
    ]
};

/**
 * Represents autocomplete interaction data.
 */
export const mockAutocompleteSubcommand: APIApplicationCommandAutocompleteInteraction["data"] = {
    ...mockChatInputCommand,
    options: [{
        name: "bar",
        options: [
            {
                name: "foo",
                type: ApplicationCommandOptionType.String,
                value: "Hello World"
            },
            {
                focused: true,
                name: "bar",
                type: ApplicationCommandOptionType.Integer,
                value: 42
            }
        ],
        type: ApplicationCommandOptionType.Subcommand
    }]
};

/**
 * Represents a message application command.
 */
export const mockMessageCommand: APIMessageApplicationCommandInteractionData = {
    id: "91256340920236565",
    name: "ping",
    resolved: {
        messages: mockResolvedData.messages
    },
    target_id: "91256340920236565",
    type: ApplicationCommandType.Message
};

/**
 * Represents a user application command.
 */
export const mockUserCommand: APIUserApplicationCommandInteractionData = {
    id: "91256340920236565",
    name: "ping",
    resolved: {
        members: mockResolvedData.members,
        users: mockResolvedData.users
    },
    target_id: "257522665441460225",
    type: ApplicationCommandType.User
};
