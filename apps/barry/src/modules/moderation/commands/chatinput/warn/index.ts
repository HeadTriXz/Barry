import { type APIUser, PermissionFlagsBits, MessageFlags } from "@discordjs/core";
import {
    type ApplicationCommandInteraction,
    SlashCommand,
    SlashCommandOptionBuilder
} from "@barry/core";
import { type PartialGuildMember, isAboveMember } from "../../../functions/permissions.js";
import type ModerationModule from "../../../index.js";

import { COMMON_MINOR_REASONS } from "../../../constants.js";
import { CaseType } from "@prisma/client";
import { DiscordAPIError } from "@discordjs/rest";
import config from "../../../../../config.js";

/**
 * Options for the warn command.
 */
export interface WarnOptions {
    /**
     * The member to warn.
     */
    member: PartialGuildMember;

    /**
     * The reason for the warning.
     */
    reason: string;
}

/**
 * Represents a slash command that warns a user.
 */
export default class extends SlashCommand<ModerationModule> {
    /**
     * Represents the constructor of this slash command.
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
        if (!interaction.isInvokedInGuild()) {
            return;
        }

        if (options.member.user.id === interaction.user.id) {
            return interaction.createMessage({
                content: `${config.emotes.error} You cannot warn yourself.`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (options.member.user.id === this.client.applicationID) {
            return interaction.createMessage({
                content: `${config.emotes.error} Your attempt to warn me has been classified as a failed comedy show audition.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const guild = await this.client.api.guilds.get(interaction.guildID);
        if (!isAboveMember(guild, interaction.member, options.member)) {
            return interaction.createMessage({
                content: `${config.emotes.error} You cannot warn a member with a higher or equal role to you.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const self = await this.client.api.guilds.getMember(interaction.guildID, this.client.applicationID);
        if (!isAboveMember(guild, self as PartialGuildMember, options.member)) {
            return interaction.createMessage({
                content: `${config.emotes.error} I cannot warn a member with a higher or equal role to me.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const entity = await this.module.cases.create({
            creatorID: interaction.user.id,
            guildID: interaction.guildID,
            note: options.reason,
            type: CaseType.Warn,
            userID: options.member.user.id
        });

        try {
            const channel = await this.client.api.users.createDM(options.member.user.id);
            await this.client.api.channels.createMessage(channel.id, {
                embeds: [{
                    color: config.defaultColor,
                    description: `${config.emotes.error} You have been warned in **${guild.name}**`,
                    fields: [{
                        name: "**Reason**",
                        value: options.reason
                    }]
                }]
            });
        } catch (error: unknown) {
            if (!(error instanceof DiscordAPIError) || error.code !== 50007) {
                this.client.logger.error(error);
            }

            return this.#onSuccess(interaction, entity.id, options.member.user, true);
        }

        await this.#onSuccess(interaction, entity.id, options.member.user);

        const settings = await this.module.moderationSettings.getOrCreate(interaction.guildID);
        await this.module.createLogMessage({
            case: entity,
            creator: interaction.user,
            reason: options.reason,
            user: options.member.user
        }, settings);
    }

    /**
     * Sends a success message to the user.
     *
     * @param interaction The interaction to reply to.
     * @param caseID The ID of the case.
     * @param user The user that has gotten warned.
     * @param isDisabled Whether the user's DMs are disabled.
     */
    async #onSuccess(
        interaction: ApplicationCommandInteraction,
        caseID: number,
        user: APIUser,
        isDisabled: boolean = false
    ): Promise<void> {
        let content = `Successfully warned \`${user.username}\`.`;
        if (isDisabled) {
            content += " However, they have disabled their DMs, so I was unable to notify them.";
        }

        const warnings = await this.module.cases.getByUser(interaction.guildID!, user.id, CaseType.Warn);
        if (warnings.length === 2) {
            content += " They already have a warning; please review their previous cases and take action if needed.";
        } else if (warnings.length > 2) {
            content += ` They currently have \`${warnings.length - 1}\` warnings; please review their previous cases and take action if needed.`;
        }

        await interaction.createMessage({
            content: `${config.emotes.check} Case \`${caseID}\` | ${content}`,
            flags: MessageFlags.Ephemeral
        });
    }
}
