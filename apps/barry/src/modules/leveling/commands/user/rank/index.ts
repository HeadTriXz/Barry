import {
    type ApplicationCommandInteraction,
    type UserCommandTarget,
    UserCommand
} from "@barry-bot/core";
import type LevelingModule from "../../../index.js";

import { viewRank } from "../../../functions/viewRank.js";

/**
 * Represents a user command that allows users to view someone's rank card.
 */
export default class extends UserCommand<LevelingModule> {
    /**
     * Represents a user command that allows users to view someone's rank card.
     *
     * @param module The module the command belongs to.
     */
    constructor(module: LevelingModule) {
        super(module, {
            name: "View Rank",
            guildOnly: true
        });
    }

    /**
     * Executes the "View Rank" command.
     *
     * @param interaction The interaction that triggered the command.
     * @param target The resolved data provided with the command.
     */
    async execute(interaction: ApplicationCommandInteraction, { user }: UserCommandTarget): Promise<void> {
        return viewRank(this.module, interaction, user);
    }
}
