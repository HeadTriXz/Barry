import { type APIApplicationCommandInteractionData, ApplicationCommandType } from "@discordjs/core";

import type { ChatInputApplicationCommandInteractionData } from "./ChatInputApplicationCommandInteractionData.js";
import type { MessageApplicationCommandInteractionData } from "./MessageApplicationCommandInteractionData.js";
import type { UserApplicationCommandInteractionData } from "./UserApplicationCommandInteractionData.js";

/**
 * Represents the data of an application command interaction.
 */
export type AnyApplicationCommandInteractionData = ChatInputApplicationCommandInteractionData
    | MessageApplicationCommandInteractionData
    | UserApplicationCommandInteractionData;

/**
 * Represents the data of an application command interaction.
 */
export class ApplicationCommandInteractionData {
    /**
     * The ID of the guild the invoked application command is registered to.
     */
    guildID?: string;

    /**
     * The ID of the invoked application command.
     */
    id: string;

    /**
     * The name of the invoked application command.
     */
    name: string;

    /**
     * The type of application command.
     */
    type: ApplicationCommandType;

    /**
     * Represents the data of an application command interaction.
     *
     * @param data The raw data of the interaction.
     */
    constructor(data: APIApplicationCommandInteractionData) {
        this.guildID = data.guild_id;
        this.id = data.id;
        this.name = data.name;
        this.type = data.type;
    }

    /**
     * Checks if this application command is of type "CHAT_INPUT".
     *
     * @returns Whether this application command is of type "CHAT_INPUT".
     */
    isChatInput(): this is ChatInputApplicationCommandInteractionData {
        return this.type === ApplicationCommandType.ChatInput;
    }

    /**
     * Checks if this application command is of type "MESSAGE".
     *
     * @returns Whether this application command is of type "MESSAGE".
     */
    isMessage(): this is MessageApplicationCommandInteractionData {
        return this.type === ApplicationCommandType.Message;
    }

    /**
     * Checks if this application command is of type "USER".
     *
     * @returns Whether this application command is of type "USER".
     */
    isUser(): this is UserApplicationCommandInteractionData {
        return this.type === ApplicationCommandType.User;
    }
}
