import { type AnyInteraction, Interaction } from "../index.js";
import { type APIInteraction, InteractionType } from "@discordjs/core";

import type { Client } from "../../Client.js";
import type { ResponseHandler } from "../../Server.js";

import { ApplicationCommandInteraction } from "../ApplicationCommandInteraction.js";
import { AutocompleteInteraction } from "../AutocompleteInteraction.js";
import { MessageComponentInteraction } from "../MessageComponentInteraction.js";
import { ModalSubmitInteraction } from "../ModalSubmitInteraction.js";
import { PingInteraction } from "../PingInteraction.js";

/**
 * Factory class for creating interaction instances.
 */
export class InteractionFactory {
    /**
     * Creates an instance of the appropriate interaction based on the interaction type.
     *
     * @param data The raw interaction data.
     * @param client The client that received the interaction.
     * @param respond The response handler to use for this interaction.
     * @returns The created instance of the interaction.
     */
    static from(data: APIInteraction, client: Client, respond?: ResponseHandler): AnyInteraction {
        switch (data.type) {
            case InteractionType.Ping: {
                return new PingInteraction(data, client, respond);
            }
            case InteractionType.ApplicationCommand: {
                return new ApplicationCommandInteraction(data, client, respond);
            }
            case InteractionType.MessageComponent: {
                return new MessageComponentInteraction(data, client, respond);
            }
            case InteractionType.ApplicationCommandAutocomplete: {
                return new AutocompleteInteraction(data, client, respond);
            }
            case InteractionType.ModalSubmit: {
                return new ModalSubmitInteraction(data, client, respond);
            }
            default: {
                return new Interaction(data, client, respond) as AnyInteraction;
            }
        }
    }
}
