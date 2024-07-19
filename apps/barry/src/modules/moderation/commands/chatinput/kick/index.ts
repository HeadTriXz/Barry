import {
    type ApplicationCommandInteraction,
    SlashCommand,
    SlashCommandOptionBuilder
} from "@barry-bot/core";
import { type KickOptions } from "../../../../../types/moderation.js";
import type ModerationModule from "../../../index.js";

import { InteractionContextType, PermissionFlagsBits } from "@discordjs/core";
import { COMMON_SEVERE_REASONS } from "../../../constants.js";

/**
 * Represents a slash command that kicks a user.
 */
export default class extends SlashCommand<ModerationModule> {
    /**
     * Represents a slash command that kicks a user.
     *
     * @param module The module this command belongs to.
     */
    constructor(module: ModerationModule) {
        super(module, {
            name: "kick",
            description: "Kick a user from the server.",
            appPermissions: PermissionFlagsBits.KickMembers,
            contexts: [InteractionContextType.Guild],
            defaultMemberPermissions: PermissionFlagsBits.KickMembers,
            options: {
                member: SlashCommandOptionBuilder.member({
                    description: "The member to kick.",
                    required: true
                }),
                reason: SlashCommandOptionBuilder.string({
                    description: "The reason for the kick (type to enter a custom reason)",
                    maximum: 200,
                    required: true,
                    autocomplete: (value) => COMMON_SEVERE_REASONS
                        .filter((x) => x.toLowerCase().startsWith(value.toLowerCase()))
                        .map((x) => ({ name: x, value: x }))
                })
            }
        });
    }

    /**
     * Kicks the user from the guild.
     *
     * @param interaction The interaction that triggered the command.
     * @param options The options for the command.
     */
    async execute(interaction: ApplicationCommandInteraction, options: KickOptions): Promise<void> {
        return this.module.actions.kick(interaction, options);
    }
}
