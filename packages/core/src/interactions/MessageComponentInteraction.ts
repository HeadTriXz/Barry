import type {
    APIMessage,
    APIMessageComponentInteraction,
    InteractionType
} from "@discordjs/core";

import type { AnyMessageComponentInteractionData } from "./data/index.js";
import type { Client } from "../Client.js";
import type { ResponseHandler } from "../Server.js";

import { MessageComponentInteractionDataFactory } from "./factories/index.js";
import { UpdatableInteraction } from "./UpdatableInteraction.js";

/**
 * Represents a message component interaction.
 */
export class MessageComponentInteraction extends UpdatableInteraction {
    /**
     * The data of the interaction.
     */
    data: AnyMessageComponentInteractionData;

    /**
     * The message the interaction is for.
     */
    message: APIMessage;

    /**
     * The type of interaction.
     */
    declare type: InteractionType.MessageComponent;

    /**
     * Represents a message component interaction.
     *
     * @param data The raw interaction object.
     * @param client The client that received the interaction.
     * @param respond The response handler to use for this interaction.
     */
    constructor(data: APIMessageComponentInteraction, client: Client, respond?: ResponseHandler) {
        super(data, client, respond);

        this.data = MessageComponentInteractionDataFactory.from(data.data);
        this.message = data.message;
    }
}
