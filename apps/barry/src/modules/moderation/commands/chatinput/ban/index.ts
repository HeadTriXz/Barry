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
import { type PartialGuildMember, isAboveMember } from "../../../functions/permissions.js";
import type ModerationModule from "../../../index.js";

import { COMMON_SEVERE_REASONS } from "../../../constants.js";
import { CaseType } from "@prisma/client";
import { DiscordAPIError } from "@discordjs/rest";
import { getDuration } from "../../../functions/getDuration.js";

import config from "../../../../../config.js";

/**
 * Options for the ban command.
 */
export interface BanOptions {
    /**
     * Whether to delete the user's messages.
     */
    delete?: boolean;

    /**
     * The duration of the ban.
     */
    duration?: string;

    /**
     * The reason for the ban.
     */
    reason: string;

    /**
     * The user to ban.
     */
    user: APIUser;
}

/**
 * The maximum duration in seconds (28 days).
 */
const MAX_DURATION = 2419200;

/**
 * The minimum duration in seconds (1 minute).
 */
const MIN_DURATION = 60;

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
        if (!interaction.isInvokedInGuild() || !interaction.data.isChatInput()) {
            return;
        }

        let duration: number | undefined;
        if (options.duration !== undefined) {
            duration = getDuration(options.duration);
            if (duration < MIN_DURATION) {
                return interaction.createMessage({
                    content: `${config.emotes.error} The duration must at least be 60 seconds.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            if (duration > MAX_DURATION) {
                return interaction.createMessage({
                    content: `${config.emotes.error} The duration must not exceed 28 days.`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        if (options.user.id === interaction.user.id) {
            return interaction.createMessage({
                content: `${config.emotes.error} You cannot ban yourself.`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (options.user.id === this.client.applicationID) {
            return interaction.createMessage({
                content: `${config.emotes.error} Your attempt to ban me has been classified as a failed comedy show audition.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const guild = await this.client.api.guilds.get(interaction.guildID);
        const member = interaction.data.resolved.members.get(options.user.id);
        if (member !== undefined) {
            if (!isAboveMember(guild, interaction.member, member)) {
                return interaction.createMessage({
                    content: `${config.emotes.error} You cannot ban this member.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const self = await this.client.api.guilds.getMember(interaction.guildID, this.client.applicationID);
            if (!isAboveMember(guild, self as PartialGuildMember, member)) {
                return interaction.createMessage({
                    content: `${config.emotes.error} I cannot ban this member.`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        const tempBan = await this.module.tempBans.get(interaction.guildID, options.user.id);
        const isBanned = member === undefined
            && await this.module.isBanned(interaction.guildID, options.user.id);

        if (tempBan !== null) {
            if (duration === undefined) {
                await this.module.tempBans.delete(interaction.guildID, options.user.id);
            } else {
                await this.module.tempBans.update(interaction.guildID, options.user.id, duration);
            }
        } else if (duration !== undefined) {
            await this.module.tempBans.create(interaction.guildID, options.user.id, duration);
        } else if (isBanned) {
            return interaction.createMessage({
                content: `${config.emotes.error} This user is already banned.`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (member !== undefined) {
            try {
                const channel = await this.client.api.users.createDM(options.user.id);
                const fields = [{
                    name: "**Reason**",
                    value: options.reason
                }];

                if (duration !== undefined) {
                    fields.push({
                        name: "**Duration**",
                        value: `Expires <t:${Math.trunc(((Date.now() / 1000) + duration))}:R>`
                    });
                }

                await this.client.api.channels.createMessage(channel.id, {
                    embeds: [{
                        color: config.defaultColor,
                        description: `${config.emotes.error} You have been banned from **${guild.name}**`,
                        fields: fields
                    }]
                });
            } catch (error: unknown) {
                if (!(error instanceof DiscordAPIError) || error.code !== 50007) {
                    this.client.logger.error(error);
                }
            }
        }

        if (!isBanned) {
            try {
                await this.client.api.guilds.banUser(interaction.guildID, options.user.id, {
                    delete_message_seconds: options.delete ? 604800 : 0
                }, {
                    reason: options.reason
                });
            } catch (error: unknown) {
                this.client.logger.error(error);

                return interaction.createMessage({
                    content: `${config.emotes.error} Failed to ban this member.`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        const entity = await this.module.cases.create({
            creatorID: interaction.user.id,
            guildID: interaction.guildID,
            note: options.reason,
            type: CaseType.Ban,
            userID: options.user.id
        });

        await interaction.createMessage({
            content: `${config.emotes.check} Case \`${entity.id}\` | Successfully banned \`${options.user.username}\`.`,
            flags: MessageFlags.Ephemeral
        });

        const settings = await this.module.moderationSettings.getOrCreate(interaction.guildID);
        await this.module.createLogMessage({
            case: entity,
            creator: interaction.user,
            duration: duration,
            reason: options.reason,
            user: options.user
        }, settings);
    }
}
