import type { AutocompleteInteraction, Client } from "../../index.js";
import type { ApplicationCommandOptionWithOptions } from "../../commands/types.js";
import type { InteractionHandler } from "./InteractionService.js";

import { ApplicationCommandOptionType, ApplicationCommandType } from "@discordjs/core";

/**
 * Represents a handler that processes incoming autocomplete interactions.
 */
export class AutocompleteInteractionHandler implements InteractionHandler {
    /**
     * The client that initialized the handler.
     */
    #client: Client;

    /**
     * Represents a handler that processes incoming autocomplete interactions.
     *
     * @param client The client that initialized the handler.
     */
    constructor(client: Client) {
        this.#client = client;
    }

    /**
     * Handles the incoming interaction.
     *
     * @param interaction The interaction to handle.
     */
    async handle(interaction: AutocompleteInteraction): Promise<void> {
        const command = this.#client.commands.get(interaction);
        if (command?.type !== ApplicationCommandType.ChatInput) {
            return;
        }

        const option = this.#getFocusedOption(interaction.data);
        if (option === undefined) {
            return;
        }

        const data = command.options.find((x) => x.name === option.name);
        if (data === undefined) {
            throw new Error(`Application command option "${option.name}" is missing.`);
        }

        if (data.autocomplete === undefined) {
            throw new Error("Application command option is missing autocomplete callback.");
        }

        if (
            data.type === ApplicationCommandOptionType.Integer ||
            data.type === ApplicationCommandOptionType.Number
        ) {
            const number = Number(option.value);
            if (isNaN(number)) {
                return;
            }

            option.value = number;
        }

        const results = await data.autocomplete(option.value as never, interaction);
        await interaction.result(results);
    }

    /**
     * Retrieves the focused option from the provided object recursively.
     *
     * @param data The object to search for the focused option.
     * @returns The focused option, if found.
     */
    #getFocusedOption(data: ApplicationCommandOptionWithOptions): ApplicationCommandOptionWithOptions | undefined {
        if (data.options === undefined) {
            return;
        }

        for (const option of data.options) {
            if (option.focused) {
                return option;
            }

            const result = this.#getFocusedOption(option);
            if (result !== undefined) {
                return result;
            }
        }
    }
}
