import {
    type ApplicationCommandInteraction,
    SlashCommand,
    SlashCommandOptionBuilder
} from "@barry/core";
import { type PartialGuildMember, isAboveMember } from "../../../functions/permissions.js";
import type ModerationModule from "../../../index.js";

import { MessageFlags, PermissionFlagsBits } from "@discordjs/core";
import { COMMON_SEVERE_REASONS } from "../../../constants.js";
import { CaseType } from "@prisma/client";

import config from "../../../../../config.js";

/**
 * Options for the kick command.
 */
export interface KickOptions {
    /**
     * The member to kick.
     */
    member: PartialGuildMember;

    /**
     * The reason for the kick.
     */
    reason: string;
}

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
            defaultMemberPermissions: PermissionFlagsBits.KickMembers,
            guildOnly: true,
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
     * Kicks the user from the server.
     *
     * @param interaction The interaction that triggered the command.
     * @param options The options for the command.
     */
    async execute(interaction: ApplicationCommandInteraction, options: KickOptions): Promise<void> {
        if (!interaction.isInvokedInGuild()) {
            return;
        }

        if (options.member.user.id === interaction.user.id) {
            return interaction.createMessage({
                content: `${config.emotes.error} You cannot kick yourself.`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (options.member.user.id === this.client.applicationID) {
            return interaction.createMessage({
                content: `${config.emotes.error} Your attempt to kick me has been classified as a failed comedy show audition.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const guild = await this.client.api.guilds.get(interaction.guildID);
        if (!isAboveMember(guild, interaction.member, options.member)) {
            return interaction.createMessage({
                content: `${config.emotes.error} You cannot kick this member.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const self = await this.client.api.guilds.getMember(interaction.guildID, this.client.applicationID);
        if (!isAboveMember(guild, self as PartialGuildMember, options.member)) {
            return interaction.createMessage({
                content: `${config.emotes.error} I cannot kick this member.`,
                flags: MessageFlags.Ephemeral
            });
        }

        await this.module.notifyUser({
            guild: guild,
            reason: options.reason,
            type: CaseType.Kick,
            userID: options.member.user.id
        });

        try {
            await this.client.api.guilds.removeMember(interaction.guildID, options.member.user.id, {
                reason: options.reason
            });
        } catch (error: unknown) {
            this.client.logger.error(error);

            return interaction.createMessage({
                content: `${config.emotes.error} Failed to kick this member.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const entity = await this.module.cases.create({
            creatorID: interaction.user.id,
            guildID: interaction.guildID,
            note: options.reason,
            type: CaseType.Kick,
            userID: options.member.user.id
        });

        await interaction.createMessage({
            content: `${config.emotes.check} Case \`${entity.id}\` | Successfully kicked \`${options.member.user.username}\`.`,
            flags: MessageFlags.Ephemeral
        });

        const settings = await this.module.moderationSettings.getOrCreate(interaction.guildID);
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
