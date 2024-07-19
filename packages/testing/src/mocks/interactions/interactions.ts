import {
    type APIApplicationCommandAutocompleteInteraction,
    type APIApplicationCommandInteractionData,
    type APIApplicationCommandInteractionWrapper,
    type APIBaseInteraction,
    type APIChatInputApplicationCommandInteractionData,
    type APIMessageComponentInteraction,
    type APIMessageComponentInteractionData,
    type APIModalSubmitInteraction,
    type APIPingInteraction,
    ApplicationIntegrationType,
    InteractionType
} from "@discordjs/core";

import { mockChannel, mockInteractionMember, mockMessage } from "../common.js";
import { mockAutocompleteCommand, mockChatInputCommand } from "./commands.js";
import { mockMessageButton } from "./components.js";

/**
 * Represents the base interaction data.
 */
const baseInteraction = {
    application_id: "49072635294295155",
    app_permissions: "8",
    authorizing_integration_owners: {
        [ApplicationIntegrationType.GuildInstall]: "68239102456844360"
    },
    entitlements: [],
    guild_id: "68239102456844360",
    guild_locale: "en-US",
    id: "82634092357100295",
    locale: "en-US",
    member: mockInteractionMember,
    token: "SUPER-SECRET-TOKEN",
    version: 1
} satisfies Omit<APIBaseInteraction<InteractionType, any>, "type">;

/**
 * Represents a mock ping interaction.
 */
export const mockPingInteraction = {
    ...baseInteraction,
    type: InteractionType.Ping
} satisfies APIPingInteraction;

/**
 * Creates a mock application command interaction.
 */
export const createMockApplicationCommandInteraction = <
    T extends APIApplicationCommandInteractionData = APIChatInputApplicationCommandInteractionData
>(data: T = mockChatInputCommand as T): APIApplicationCommandInteractionWrapper<T> => ({
    ...baseInteraction,
    channel: mockChannel,
    channel_id: "30527482987641765",
    data: data,
    type: InteractionType.ApplicationCommand
});

/**
 * Creates a mock message component interaction.
 */
export const createMockMessageComponentInteraction = (
    data: APIMessageComponentInteractionData = mockMessageButton
): APIMessageComponentInteraction => ({
    ...baseInteraction,
    channel: mockChannel,
    channel_id: "30527482987641765",
    data: data,
    message: mockMessage,
    type: InteractionType.MessageComponent
});

/**
 * Represents a mock autocomplete interaction.
 */
export const createMockAutocompleteInteraction = (
    data: APIApplicationCommandAutocompleteInteraction["data"] = mockAutocompleteCommand
): APIApplicationCommandAutocompleteInteraction => ({
    ...baseInteraction,
    data: data,
    type: InteractionType.ApplicationCommandAutocomplete
});

/**
 * Represents a mock modal submit interaction.
 */
export const createMockModalSubmitInteraction = (
    data: APIModalSubmitInteraction["data"] = {
        custom_id: "modal",
        components: []
    }
): APIModalSubmitInteraction => ({
    ...baseInteraction,
    data: data,
    type: InteractionType.ModalSubmit
});
