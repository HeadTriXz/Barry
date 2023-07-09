import {
    type AnyApplicationCommandInteractionData,
    ApplicationCommandInteractionData,
    ChatInputApplicationCommandInteractionData,
    MessageApplicationCommandInteractionData,
    UserApplicationCommandInteractionData
} from "../data/index.js";

import { type APIApplicationCommandInteractionData, ApplicationCommandType } from "@discordjs/core";

/**
 * Factory class for creating application command interaction data instances.
 */
export class ApplicationCommandInteractionDataFactory {
    /**
     * Creates an instance of the appropriate application command interaction data based on the data type.
     *
     * @param data The raw application command interaction data.
     * @returns The created instance of the application command interaction data.
     */
    static from(data: APIApplicationCommandInteractionData): AnyApplicationCommandInteractionData {
        switch (data.type) {
            case ApplicationCommandType.ChatInput: {
                return new ChatInputApplicationCommandInteractionData(data);
            }
            case ApplicationCommandType.Message: {
                return new MessageApplicationCommandInteractionData(data);
            }
            case ApplicationCommandType.User: {
                return new UserApplicationCommandInteractionData(data);
            }
            default: {
                return new ApplicationCommandInteractionData(data) as AnyApplicationCommandInteractionData;
            }
        }
    }
}
