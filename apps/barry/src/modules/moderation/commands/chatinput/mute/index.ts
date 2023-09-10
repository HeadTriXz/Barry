import {
    type ApplicationCommandInteraction,
    SlashCommand,
    SlashCommandOptionBuilder
} from "@barry/core";
import { type PartialGuildMember, isAboveMember } from "../../../functions/permissions.js";
import type ModerationModule from "../../../index.js";

import { MessageFlags, PermissionFlagsBits } from "@discordjs/core";
import { COMMON_MINOR_REASONS } from "../../../constants.js";
import { CaseType } from "@prisma/client";
import { getDuration } from "../../../functions/getDuration.js";

import config from "../../../../../config.js";

/**
 * Options for the mute command.
 */
export interface MuteOptions {
    /**
     * The duration of the mute.
     */
    duration: string;

    /**
     * The member to mute.
     */
    member: PartialGuildMember;

    /**
     * The reason for the mute.
     */
    reason: string;
}

/**
 * The maximum duration in seconds (28 days).
 */
const MAX_DURATION = 2419200;

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
        if (!interaction.isInvokedInGuild()) {
            return;
        }

        const duration = getDuration(options.duration);
        if (duration < 10) {
            return interaction.createMessage({
                content: `${config.emotes.error} The duration must at least be 10 seconds.`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (duration > MAX_DURATION) {
            return interaction.createMessage({
                content: `${config.emotes.error} The duration must not exceed 28 days.`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (options.member.user.id === interaction.user.id) {
            return interaction.createMessage({
                content: `${config.emotes.error} You cannot mute yourself.`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (options.member.user.id === this.client.applicationID) {
            return interaction.createMessage({
                content: `${config.emotes.error} Your attempt to mute me has been classified as a failed comedy show audition.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const guild = await this.client.api.guilds.get(interaction.guildID);
        if (!isAboveMember(guild, interaction.member, options.member)) {
            return interaction.createMessage({
                content: `${config.emotes.error} You cannot mute this member.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const self = await this.client.api.guilds.getMember(interaction.guildID, this.client.applicationID);
        if (!isAboveMember(guild, self as PartialGuildMember, options.member)) {
            return interaction.createMessage({
                content: `${config.emotes.error} I cannot mute this member.`,
                flags: MessageFlags.Ephemeral
            });
        }

        await this.module.notifyUser({
            duration: duration,
            guild: guild,
            reason: options.reason,
            type: CaseType.Mute,
            userID: options.member.user.id
        });

        try {
            await this.client.api.guilds.editMember(interaction.guildID, options.member.user.id, {
                communication_disabled_until: new Date(Date.now() + 1000 * duration).toISOString()
            });
        } catch (error: unknown) {
            this.client.logger.error(error);

            return interaction.createMessage({
                content: `${config.emotes.error} Failed to mute this member.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const entity = await this.module.cases.create({
            creatorID: interaction.user.id,
            guildID: interaction.guildID,
            note: options.reason,
            type: CaseType.Mute,
            userID: options.member.user.id
        });

        await interaction.createMessage({
            content: `${config.emotes.check} Case \`${entity.id}\` | Successfully muted \`${options.member.user.username}\`.`,
            flags: MessageFlags.Ephemeral
        });

        const settings = await this.module.moderationSettings.getOrCreate(interaction.guildID);
        await this.module.createLogMessage({
            case: entity,
            creator: interaction.user,
            duration: duration,
            reason: options.reason,
            user: options.member.user
        }, settings);
    }
}
