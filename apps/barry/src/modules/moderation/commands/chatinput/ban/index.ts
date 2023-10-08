import {
    type ApplicationCommandInteraction,
    SlashCommand,
    SlashCommandOptionBuilder
} from "@barry/core";
import type { BanOptions } from "../../../../../types/moderation.js";
import type ModerationModule from "../../../index.js";

import { COMMON_SEVERE_REASONS } from "../../../constants.js";
import { PermissionFlagsBits } from "@discordjs/core";

/**
 * Represents a slash command that bans a user.
 */
export default class extends SlashCommand<ModerationModule> {
    /**
     * Represents a slash command that bans a user.
     *
     * @param module The module this command belongs to.
     */
    constructor(module: ModerationModule) {
        super(module, {
            name: "ban",
            description: "Ban a user from the server.",
            appPermissions: PermissionFlagsBits.BanMembers,
            defaultMemberPermissions: PermissionFlagsBits.BanMembers,
            guildOnly: true,
            options: {
                user: SlashCommandOptionBuilder.user({
                    description: "The user to ban.",
                    required: true
                }),
                reason: SlashCommandOptionBuilder.string({
                    description: "The reason for the ban (type to enter a custom reason)",
                    maximum: 200,
                    required: true,
                    autocomplete: (value) => COMMON_SEVERE_REASONS
                        .filter((x) => x.toLowerCase().startsWith(value.toLowerCase()))
                        .map((x) => ({ name: x, value: x }))
                }),
                delete: SlashCommandOptionBuilder.boolean({
                    description: "Whether to delete the user's messages."
                }),
                duration: SlashCommandOptionBuilder.string({
                    description: "The duration of the ban."
                })
            }
        });
    }

    /**
     * Bans a user from the server.
     *
     * @param interaction The interaction that triggered the command.
     * @param options The options for the command.
     */
    async execute(interaction: ApplicationCommandInteraction, options: BanOptions): Promise<void> {
        return this.module.actions.ban(interaction, options);
    }
}
