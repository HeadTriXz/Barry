import type { APIApplicationCommandInteraction, InteractionType } from "@discordjs/core";

import type { AnyApplicationCommandInteractionData } from "./data/index.js";
import type { Client } from "../Client.js";
import type { ResponseHandler } from "../Server.js";

import { ApplicationCommandInteractionDataFactory } from "./factories/index.js";
import { ReplyableInteraction } from "./ReplyableInteraction.js";

/**
 * Represents an application command interaction.
 */
export class ApplicationCommandInteraction extends ReplyableInteraction {
    /**
     * The data of the interaction.
     */
    data: AnyApplicationCommandInteractionData;

    /**
     * The type of interaction.
     */
    declare type: InteractionType.ApplicationCommand;

    /**
     * Represents an application command interaction.
     *
     * @param data The raw interaction object.
     * @param client The client that received the interaction.
     * @param respond The response handler to use for this interaction.
     */
    constructor(data: APIApplicationCommandInteraction, client: Client, respond?: ResponseHandler) {
        super(data, client, respond);

        this.data = ApplicationCommandInteractionDataFactory.from(data.data);
    }
}
