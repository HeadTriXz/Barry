import {
    type APIUser,
    MessageFlags,
    PermissionFlagsBits
} from "@discordjs/core";
import {
    type ApplicationCommandInteraction,
    SlashCommand,
    SlashCommandOptionBuilder
} from "@barry/core";
import type ModerationModule from "../../../index.js";

import { CaseType } from "@prisma/client";
import { DiscordAPIError } from "@discordjs/rest";
import config from "../../../../../config.js";

/**
 * Options for the unban command.
 */
export interface UnbanOptions {
    /**
     * The reason for the unban.
     */
    reason: string;

    /**
     * The user to unban.
     */
    user: APIUser;
}

/**
 * Represents a slash command that unbans a user.
 */
export default class extends SlashCommand<ModerationModule> {
    /**
     * Represents a slash command that unbans a user.
     *
     * @param module The module this command belongs to.
     */
    constructor(module: ModerationModule) {
        super(module, {
            name: "unban",
            description: "Unban a user.",
            appPermissions: PermissionFlagsBits.BanMembers,
            defaultMemberPermissions: PermissionFlagsBits.BanMembers,
            guildOnly: true,
            options: {
                user: SlashCommandOptionBuilder.user({
                    description: "The user to unban.",
                    required: true
                }),
                reason: SlashCommandOptionBuilder.string({
                    description: "The reason for the unban.",
                    required: true
                })
            }
        });
    }

    /**
     * Unbans a member.
     *
     * @param interaction The interaction that triggered this command.
     * @param options The options for the command.
     */
    async execute(interaction: ApplicationCommandInteraction, options: UnbanOptions): Promise<void> {
        if (!interaction.isInvokedInGuild()) {
            return;
        }

        try {
            await this.client.api.guilds.unbanUser(interaction.guildID, options.user.id, {
                reason: options.reason
            });
        } catch (error: unknown) {
            if (error instanceof DiscordAPIError && error.code === 10026) {
                return interaction.createMessage({
                    content: `${config.emotes.error} That user is not banned.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            this.client.logger.error(error);

            return interaction.createMessage({
                content: `${config.emotes.error} Failed to unban that user.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const entity = await this.module.cases.create({
            creatorID: interaction.user.id,
            guildID: interaction.guildID,
            note: options.reason,
            type: CaseType.Unban,
            userID: options.user.id
        });

        await interaction.createMessage({
            content: `${config.emotes.check} Case \`${entity.id}\` | Successfully unbanned \`${options.user.username}\`.`,
            flags: MessageFlags.Ephemeral
        });

        const settings = await this.module.moderationSettings.getOrCreate(interaction.guildID);
        await this.module.createLogMessage({
            case: entity,
            creator: interaction.user,
            reason: options.reason,
            user: options.user
        }, settings);
    }
}
