import {
    type ApplicationCommandInteraction,
    type UserCommandTarget,
    UserCommand
} from "@barry/core";
import type LevelingModule from "../../../index.js";

import { MessageFlags } from "@discordjs/core";
import config from "../../../../../config.js";

/**
 * Represents a user command to give reputation to a member.
 */
export default class extends UserCommand<LevelingModule> {
    /**
     * Represents a user command to give reputation to a member.
     *
     * @param module The module this command belongs to.
     */
    constructor(module: LevelingModule) {
        super(module, {
            name: "Give Reputation",
            cooldown: 86400,
            guildOnly: true
        });
    }

    /**
     * Executes the "Give Reputation" command.
     *
     * @param interaction The interaction that triggered the command.
     * @param target The resolved data provided with the command.
     */
    async execute(interaction: ApplicationCommandInteraction, target: Required<UserCommandTarget>): Promise<void> {
        if (!interaction.isInvokedInGuild()) {
            return;
        }

        if (target.user.id === interaction.user.id) {
            return interaction.createMessage({
                content: `${config.emotes.error} You cannot give yourself reputation.`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (target.user.bot) {
            return interaction.createMessage({
                content: `${config.emotes.error} You cannot give reputation to a bot.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const settings = await this.module.settings.getOrCreate(interaction.guildID);
        if (settings.ignoredRoles.some((id) => interaction.member.roles.includes(id))) {
            return interaction.createMessage({
                content: `${config.emotes.error} You are not allowed to use this command.`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (settings.ignoredRoles.some((id) => target.member.roles.includes(id))) {
            return interaction.createMessage({
                content: `${config.emotes.error} This user cannot receive reputation.`,
                flags: MessageFlags.Ephemeral
            });
        }

        await this.module.memberActivity.increment(interaction.guildID, target.user.id, {
            reputation: 1
        });

        await interaction.createMessage({
            content: `${config.emotes.check} Gave +1 rep to <@${target.user.id}>.`
        });
    }
}
