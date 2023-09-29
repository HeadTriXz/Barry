import {
    type ApplicationCommandInteraction,
    SlashCommand,
    SlashCommandOptionBuilder
} from "@barry/core";
import { type MuteOptions } from "../../../../../types/moderation.js";
import type ModerationModule from "../../../index.js";

import { COMMON_MINOR_REASONS } from "../../../constants.js";
import { PermissionFlagsBits } from "@discordjs/core";

/**
 * Represents a slash command that times out a user.
 */
export default class extends SlashCommand<ModerationModule> {
    /**
     * Represents a slash command that times out a user.
     *
     * @param module The module this command belongs to.
     */
    constructor(module: ModerationModule) {
        super(module, {
            name: "mute",
            description: "Mute a member.",
            appPermissions: PermissionFlagsBits.ModerateMembers,
            defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
            guildOnly: true,
            options: {
                member: SlashCommandOptionBuilder.member({
                    description: "The member to mute.",
                    required: true
                }),
                duration: SlashCommandOptionBuilder.string({
                    description: "The duration of the mute.",
                    required: true
                }),
                reason: SlashCommandOptionBuilder.string({
                    description: "The reason for the mute (type to enter a custom reason)",
                    maximum: 200,
                    required: true,
                    autocomplete: (value) => COMMON_MINOR_REASONS
                        .filter((x) => x.toLowerCase().startsWith(value.toLowerCase()))
                        .map((x) => ({ name: x, value: x }))
                })
            }
        });
    }

    /**
     * Times out the user.
     *
     * @param interaction The interaction that triggered the command.
     * @param options The options for the command.
     */
    async execute(interaction: ApplicationCommandInteraction, options: MuteOptions): Promise<void> {
        return this.module.actions.mute(interaction, options);
    }
}
