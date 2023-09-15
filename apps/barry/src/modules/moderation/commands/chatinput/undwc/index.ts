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
import {
    type PartialGuildMember,
    isAboveMember
} from "../../../functions/permissions.js";
import type ModerationModule from "../../../index.js";

import config from "../../../../../config.js";

/**
 * Options for the undwc command.
 */
export interface UnDWCOptions {
    /**
     * The reason for removing the flag.
     */
    reason: string;

    /**
     * The user to remove the flag of.
     */
    user: APIUser;
}

/**
 * Represents a slash command that removes the 'Deal With Caution' flag from a user.
 */
export default class extends SlashCommand<ModerationModule> {
    /**
     * Represents a slash command that removes the 'Deal With Caution' flag from a user.
     *
     * @param module The module this command belongs to.
     */
    constructor(module: ModerationModule) {
        super(module, {
            name: "undwc",
            description: "Removes the 'Deal With Caution' flag from a user.",
            appPermissions: PermissionFlagsBits.ManageRoles,
            defaultMemberPermissions: PermissionFlagsBits.BanMembers,
            guildOnly: true,
            options: {
                user: SlashCommandOptionBuilder.user({
                    description: "The user to remove the flag of.",
                    required: true
                }),
                reason: SlashCommandOptionBuilder.string({
                    description: "The reason for removing the flag.",
                    required: true
                })
            }
        });
    }

    /**
     * Removes the 'Deal With Caution' flag from the user.
     *
     * @param interaction The interaction that triggered this command.
     * @param options The options for the command.
     */
    async execute(interaction: ApplicationCommandInteraction, options: UnDWCOptions): Promise<void> {
        if (!interaction.isInvokedInGuild() || !interaction.data.isChatInput()) {
            return;
        }

        const dwc = await this.module.dwcScheduledBans.get(interaction.guildID, options.user.id);
        if (dwc === null) {
            return interaction.createMessage({
                content: `${config.emotes.error} That user is not flagged.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const settings = await this.module.moderationSettings.getOrCreate(interaction.guildID);
        const member = interaction.data.resolved.members.get(options.user.id);

        if (settings.dwcRoleID !== null && member?.roles.includes(settings.dwcRoleID)) {
            const guild = await this.client.api.guilds.get(interaction.guildID);
            if (!isAboveMember(guild, interaction.member, member)) {
                return interaction.createMessage({
                    content: `${config.emotes.error} You cannot remove the 'Deal With Caution' flag from this user.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const self = await this.client.api.guilds.getMember(interaction.guildID, this.client.applicationID);
            if (!isAboveMember(guild, self as PartialGuildMember, member)) {
                return interaction.createMessage({
                    content: `${config.emotes.error} I cannot remove the 'Deal With Caution' flag from this user.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            try {
                await this.client.api.guilds.removeRoleFromMember(
                    interaction.guildID,
                    options.user.id,
                    settings.dwcRoleID,
                    {
                        reason: options.reason
                    }
                );
            } catch (error: unknown) {
                this.client.logger.error(error);
            }
        }

        const entity = await this.module.unflagUser({
            channelID: settings.channelID,
            creator: interaction.user,
            guildID: interaction.guildID,
            reason: options.reason,
            user: options.user
        });

        await interaction.createMessage({
            content: `${config.emotes.check} Case \`${entity.id}\` | Successfully removed the 'Deal With Caution' flag from \`${options.user.username}\`.`,
            flags: MessageFlags.Ephemeral
        });
    }
}
