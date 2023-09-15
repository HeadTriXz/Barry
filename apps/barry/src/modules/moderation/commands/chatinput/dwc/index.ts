import { type APIUser, PermissionFlagsBits, MessageFlags, type APIRole, OverwriteType } from "@discordjs/core";
import {
    type ApplicationCommandInteraction,
    SlashCommand,
    SlashCommandOptionBuilder
} from "@barry/core";
import { type ModerationSettings, CaseType } from "@prisma/client";
import { type PartialGuildMember, isAboveMember } from "../../../functions/permissions.js";
import type {
    ProfilesModule,
    RequestsModule,
    SettingsWithChannel
} from "../../../types.js";
import type ModerationModule from "../../../index.js";

import { COMMON_DWC_REASONS } from "../../../constants.js";
import { DiscordAPIError } from "@discordjs/rest";
import config from "../../../../../config.js";

/**
 * Options for the deal with caution command.
 */
export interface DWCOptions {
    /**
     * The reason to flag the user.
     */
    reason: string;

    /**
     * The user to mark as 'Deal With Caution'.
     */
    user: APIUser;
}

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
        if (!interaction.isInvokedInGuild() || !interaction.data.isChatInput()) {
            return;
        }

        if (options.user.id === interaction.user.id) {
            return interaction.createMessage({
                content: `${config.emotes.error} You cannot flag yourself.`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (options.user.id === this.client.applicationID) {
            return interaction.createMessage({
                content: `${config.emotes.error} Your attempt to flag me has been classified as a failed comedy show audition.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const guild = await this.client.api.guilds.get(interaction.guildID);
        const member = interaction.data.resolved.members.get(options.user.id);
        if (member !== undefined) {
            if (!isAboveMember(guild, interaction.member, member)) {
                return interaction.createMessage({
                    content: `${config.emotes.error} You cannot flag this member.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const self = await this.client.api.guilds.getMember(interaction.guildID, this.client.applicationID);
            if (!isAboveMember(guild, self as PartialGuildMember, member)) {
                return interaction.createMessage({
                    content: `${config.emotes.error} I cannot flag this member.`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        const marketplace = this.client.modules.get("marketplace");
        const profiles = marketplace?.dependencies.get("profiles") as ProfilesModule;
        const requests = marketplace?.dependencies.get("requests") as RequestsModule;

        const settings = await this.module.moderationSettings.getOrCreate(interaction.guildID);
        const profilesSettings = await profiles?.profilesSettings.getOrCreate(interaction.guildID);
        const requestsSettings = await requests?.requestsSettings.getOrCreate(interaction.guildID);

        const role = await this.getOrCreateRole(settings, profilesSettings, requestsSettings);
        if (role === undefined) {
            return interaction.createMessage({
                content: `${config.emotes.error} Failed to create the DWC role.`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (member !== undefined) {
            try {
                await this.client.api.guilds.addRoleToMember(interaction.guildID, options.user.id, role.id, {
                    reason: options.reason
                });
            } catch (error: unknown) {
                return interaction.createMessage({
                    content: `${config.emotes.error} Failed to add the DWC role to the member.`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        try {
            const guild = await this.client.api.guilds.get(interaction.guildID);
            const channel = await this.client.api.users.createDM(options.user.id);

            let content = `You have been marked with \`Deal With Caution\` in **${guild.name}**\n\n`;
            if (profilesSettings?.enabled || requestsSettings?.enabled) {
                content += "Meaning you cannot:\n- look at requests\n- create nor modify requests\n- advertise your services\n\n";
            }

            await this.client.api.channels.createMessage(channel.id, {
                embeds: [{
                    color: config.defaultColor,
                    description: `${config.emotes.error} ${content}In order to get this removed, please contact one of the staff members.\n**If you are still marked as Deal With Caution a week from now, you will automatically be banned.**`,
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
        }

        await this.module.dwcScheduledBans.create(interaction.guildID, options.user.id);

        const entity = await this.module.cases.create({
            creatorID: interaction.user.id,
            guildID: interaction.guildID,
            note: options.reason,
            type: CaseType.DWC,
            userID: options.user.id
        });

        await interaction.createMessage({
            content: `${config.emotes.check} Case \`${entity.id}\` | Successfully flagged \`${options.user.username}\`.`,
            flags: MessageFlags.Ephemeral
        });

        if (settings.channelID !== null) {
            await this.module.createLogMessage(settings.channelID, {
                case: entity,
                creator: interaction.user,
                reason: options.reason,
                user: options.user
            });
        }

        if (profilesSettings !== undefined && profilesSettings.channelID !== null) {
            await profiles?.flagUser(
                interaction.guildID,
                profilesSettings.channelID,
                options.user,
                options.reason
            );
        }

        if (requestsSettings !== undefined && requestsSettings.channelID !== null) {
            await requests?.flagUser(
                interaction.guildID,
                requestsSettings.channelID,
                options.user,
                options.reason
            );
        }
    }

    /**
     * Retrieves or creates the 'Deal With Caution' role.
     *
     * @param settings The moderation settings for the guild.
     * @param profilesSettings The profiles settings for the guild.
     * @param requestsSettings The requests settings for the guild.
     * @returns The 'Deal With Caution' role, or undefined if it failed to create it.
     */
    async getOrCreateRole(
        settings: ModerationSettings,
        profilesSettings?: SettingsWithChannel,
        requestsSettings?: SettingsWithChannel
    ): Promise<APIRole | undefined> {
        if (settings.dwcRoleID !== undefined) {
            const roles = await this.client.api.guilds.getRoles(settings.guildID);
            const role = roles.find((r) => r.id === settings.dwcRoleID);

            if (role !== undefined) {
                return role;
            }
        }

        try {
            const role = await this.client.api.guilds.createRole(settings.guildID, {
                color: config.defaultDWCColor,
                hoist: true,
                name: "Deal With Caution"
            });

            await this.module.moderationSettings.upsert(settings.guildID, {
                dwcRoleID: role.id
            });

            if (profilesSettings !== undefined && profilesSettings.channelID !== null) {
                await this.client.api.channels.editPermissionOverwrite(profilesSettings.channelID, role.id, {
                    deny: PermissionFlagsBits.ViewChannel.toString(),
                    type: OverwriteType.Role
                });
            }

            if (requestsSettings !== undefined && requestsSettings.channelID !== null) {
                await this.client.api.channels.editPermissionOverwrite(requestsSettings.channelID, role.id, {
                    deny: PermissionFlagsBits.ViewChannel.toString(),
                    type: OverwriteType.Role
                });
            }

            return role;
        } catch (error: unknown) {
            this.client.logger.error(error);
        }
    }
}
