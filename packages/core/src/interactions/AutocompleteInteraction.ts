import {
    type APIApplicationCommandAutocompleteInteraction,
    type APIApplicationCommandOptionChoice,
    type InteractionType,
    InteractionResponseType
} from "@discordjs/core";

import type { Client } from "../index.js";
import type { ResponseHandler } from "../Server.js";

import { ChatInputApplicationCommandInteractionData } from "./data/index.js";
import { Interaction } from "./Interaction.js";

/**
 * Represents an application command autocomplete interaction.
 */
export class AutocompleteInteraction extends Interaction {
    /**
     * The data of the interaction.
     */
    data: ChatInputApplicationCommandInteractionData;

    /**
     * The type of interaction.
     */
    declare type: InteractionType.ApplicationCommandAutocomplete;

    /**
     * Represents an application command autocomplete interaction.
     *
     * @param data The raw interaction object.
     * @param client The client that received the interaction.
     * @param respond The response handler to use for this interaction.
     */
    constructor(data: APIApplicationCommandAutocompleteInteraction, client: Client, respond?: ResponseHandler) {
        super(data, client, respond);

        this.data = new ChatInputApplicationCommandInteractionData(data.data);
    }

    /**
     * Acknowledges the autocomplete interaction with a result of choices.
     *
     * @param choices The autocomplete choices to return to the user.
     */
    async result(choices: APIApplicationCommandOptionChoice[]): Promise<void> {
        if (this.acknowledged) {
            throw new Error("You have already acknowledged this interaction.");
        }

        await this.createResponse({
            body: {
                type: InteractionResponseType.ApplicationCommandAutocompleteResult,
                data: { choices }
            }
        });

        this.acknowledged = true;
    }
}
