import {
    type ApplicationCommandInteraction,
    SlashCommand,
    SlashCommandOptionBuilder
} from "@barry-bot/core";
import type { PartialGuildMember } from "../../../functions/permissions.js";
import type ModerationModule from "../../../index.js";

import { MessageFlags, PermissionFlagsBits } from "@discordjs/core";
import { CaseType } from "@prisma/client";
import config from "../../../../../config.js";

/**
 * Options for the unmute command.
 */
export interface UnmuteOptions {
    /**
     * The member to unmute.
     */
    member: PartialGuildMember;

    /**
     * The reason for the unmute.
     */
    reason: string;
}

/**
 * Represents a slash command that unmutes a user.
 */
export default class extends SlashCommand<ModerationModule> {
    /**
     * Represents a slash command that unmutes a user.
     *
     * @param module The module this command belongs to.
     */
    constructor(module: ModerationModule) {
        super(module, {
            name: "unmute",
            description: "Unmute a member.",
            appPermissions: PermissionFlagsBits.ModerateMembers,
            defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
            guildOnly: true,
            options: {
                member: SlashCommandOptionBuilder.member({
                    description: "The member to unmute.",
                    required: true
                }),
                reason: SlashCommandOptionBuilder.string({
                    description: "The reason for the unmute.",
                    required: true
                })
            }
        });
    }

    /**
     * Unmutes a member.
     *
     * @param interaction The interaction that triggered this command.
     * @param options The options for the command.
     */
    async execute(interaction: ApplicationCommandInteraction, options: UnmuteOptions): Promise<void> {
        if (!interaction.isInvokedInGuild()) {
            return;
        }

        if (typeof options.member.communication_disabled_until !== "string") {
            return interaction.createMessage({
                content: `${config.emotes.error} That member is not muted`,
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            await this.client.api.guilds.editMember(interaction.guildID, options.member.user.id, {
                communication_disabled_until: null
            }, {
                reason: options.reason
            });
        } catch (error: unknown) {
            this.client.logger.error(error);

            return interaction.createMessage({
                content: `${config.emotes.error} Failed to unmute this member.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const guild = await this.client.api.guilds.get(interaction.guildID);
        await this.module.notifyUser({
            guild: guild,
            reason: options.reason,
            type: CaseType.Unmute,
            userID: options.member.user.id
        });

        const entity = await this.module.cases.create({
            creatorID: interaction.user.id,
            guildID: interaction.guildID,
            note: options.reason,
            type: CaseType.Unmute,
            userID: options.member.user.id
        });

        await interaction.createMessage({
            content: `${config.emotes.check} Case \`${entity.id}\` | Successfully unmuted \`${options.member.user.username}\`.`,
            flags: MessageFlags.Ephemeral
        });

        const settings = await this.module.settings.getOrCreate(interaction.guildID);
        if (settings.channelID !== null) {
            await this.module.createLogMessage(settings.channelID, {
                case: entity,
                creator: interaction.user,
                reason: options.reason,
                user: options.member.user
            });
        }
    }
}
