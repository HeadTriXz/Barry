import type {
    APIMessage,
    APIMessageApplicationCommandInteractionData,
    ApplicationCommandType
} from "@discordjs/core";

import { ApplicationCommandInteractionData } from "./ApplicationCommandInteractionData.js";

/**
 * Resolved data for an invoked application command.
 */
export interface MessageApplicationCommandInteractionResolvedData {
    /**
     * A map of resolved partial messages.
     */
    messages: Map<string, APIMessage>;
}

/**
 * Represents the data of an application command interaction with type "MESSAGE".
 */
export class MessageApplicationCommandInteractionData extends ApplicationCommandInteractionData {
    /**
     * Resolved data for the message command.
     */
    resolved: MessageApplicationCommandInteractionResolvedData;

    /**
     * The ID of the message targeted by the message command.
     */
    targetID: string;

    /**
     * The type of application command.
     */
    declare type: ApplicationCommandType.Message;

    /**
     * Represents the data of an application command interaction with type "MESSAGE".
     *
     * @param data The raw data of the interaction.
     */
    constructor(data: APIMessageApplicationCommandInteractionData) {
        super(data);

        this.resolved = {
            messages: new Map()
        };

        for (const id in data.resolved.messages) {
            this.resolved.messages.set(id, data.resolved.messages[id]);
        }

        this.targetID = data.target_id;
    }
}
