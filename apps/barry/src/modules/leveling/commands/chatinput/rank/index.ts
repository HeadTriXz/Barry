import {
    type ApplicationCommandInteraction,
    type UserCommandTarget,
    SlashCommand,
    SlashCommandOptionBuilder
} from "@barry-bot/core";
import type LevelingModule from "../../../index.js";

import { InteractionContextType } from "@discordjs/core";
import { viewRank } from "../../../functions/viewRank.js";

/**
 * Represents a slash command that allows users to view someone's rank card.
 */
export default class extends SlashCommand<LevelingModule> {
    /**
     * Represents a slash command that allows users to view someone's rank card.
     *
     * @param module The module the command belongs to.
     */
    constructor(module: LevelingModule) {
        super(module, {
            name: "rank",
            description: "View someone's rank card.",
            contexts: [InteractionContextType.Guild],
            options: {
                user: SlashCommandOptionBuilder.user({
                    description: "The user to view the rank card of.",
                    required: false
                })
            }
        });
    }

    /**
     * Executes the "rank" command.
     *
     * @param interaction The interaction that triggered the command.
     * @param user The resolved data provided with the command.
     */
    async execute(interaction: ApplicationCommandInteraction, { user }: Partial<UserCommandTarget>): Promise<void> {
        if (user === undefined) {
            user = interaction.user;
        }

        return viewRank(this.module, interaction, user);
    }
}
