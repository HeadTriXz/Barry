import {
    type ApplicationCommandInteraction,
    SlashCommand,
    getCreatedAt
} from "@barry-bot/core";

import type GeneralModule from "../../../index.js";
import config from "../../../../../config.js";

/**
 * Represents a slash command that shows the latency.
 */
export default class extends SlashCommand<GeneralModule> {
    /**
     * Represents a slash command that shows the latency.
     *
     * @param module The module the command belongs to.
     */
    constructor(module: GeneralModule) {
        super(module, {
            name: "ping",
            description: "Shows the latency of the bot."
        });
    }

    /**
     * Execute the "ping" command.
     *
     * @param interaction The interaction that triggered the command.
     */
    async execute(interaction: ApplicationCommandInteraction): Promise<void> {
        await interaction.defer();
        const message = await interaction.getOriginalMessage();

        await interaction.editOriginalMessage({
            content: `${config.emotes.check} Pong! \`${getCreatedAt(message.id) - interaction.createdAt}ms\``
        });
    }
}
