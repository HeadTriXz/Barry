import {
    type ApplicationCommandInteraction,
    SlashCommand,
    SlashCommandOptionBuilder
} from "@barry/core";
import { type WarnOptions } from "../../../../../types/moderation.js";
import type ModerationModule from "../../../index.js";

import { COMMON_MINOR_REASONS } from "../../../constants.js";
import { PermissionFlagsBits } from "@discordjs/core";

/**
 * Represents a slash command that warns a user.
 */
export default class extends SlashCommand<ModerationModule> {
    /**
     * Represents a slash command that warns a user.
     *
     * @param module The module this command belongs to.
     */
    constructor(module: ModerationModule) {
        super(module, {
            name: "warn",
            description: "Warns a user.",
            defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
            guildOnly: true,
            options: {
                member: SlashCommandOptionBuilder.member({
                    description: "The member to warn.",
                    required: true
                }),
                reason: SlashCommandOptionBuilder.string({
                    description: "The reason for the warning (type to enter a custom reason)",
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
     * Warns the user.
     *
     * @param interaction The interaction that triggered the command.
     * @param options The options for the command.
     */
    async execute(interaction: ApplicationCommandInteraction, options: WarnOptions): Promise<void> {
        return this.module.actions.warn(interaction, options);
    }
}
