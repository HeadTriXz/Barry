import {
    type ApplicationCommandInteraction,
    SlashCommand,
    SlashCommandOptionBuilder
} from "@barry-bot/core";
import { type DWCOptions } from "../../../../../types/moderation.js";
import type ModerationModule from "../../../index.js";

import { COMMON_DWC_REASONS } from "../../../constants.js";
import { PermissionFlagsBits } from "@discordjs/core";

/**
 * Represents a slash command to mark a user as 'Deal with Caution'.
 */
export default class extends SlashCommand<ModerationModule> {
    /**
     * Represents a slash command to mark a user as 'Deal with Caution'.
     *
     * @param module The module this command belongs to.
     */
    constructor(module: ModerationModule) {
        super(module, {
            name: "dwc",
            description: "Marks a user as 'Deal With Caution' and bans them after a week.",
            appPermissions: PermissionFlagsBits.BanMembers | PermissionFlagsBits.ManageRoles,
            defaultMemberPermissions: PermissionFlagsBits.BanMembers,
            guildOnly: true,
            options: {
                user: SlashCommandOptionBuilder.user({
                    description: "The user to mark as 'Deal With Caution'.",
                    required: true
                }),
                reason: SlashCommandOptionBuilder.string({
                    description: "The reason to flag the user (publicly visible).",
                    maximum: 200,
                    required: true,
                    autocomplete: (value) => COMMON_DWC_REASONS
                        .filter((x) => x.toLowerCase().startsWith(value.toLowerCase()))
                        .map((x) => ({ name: x, value: x }))
                })
            }
        });
    }

    /**
     * Marks a user as 'Deal With Caution'.
     *
     * @param interaction The interaction that triggered the command.
     * @param options The options for the command.
     */
    async execute(interaction: ApplicationCommandInteraction, options: DWCOptions): Promise<void> {
        if ("members" in interaction.data.resolved) {
            const member = interaction.data.resolved.members.get(options.user.id);
            if (member !== undefined) {
                options.member = member;
            }
        }

        return this.module.actions.dwc(interaction, options);
    }
}
