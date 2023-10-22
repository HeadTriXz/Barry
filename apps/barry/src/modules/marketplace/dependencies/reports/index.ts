import {
    type APIGuildForumChannel,
    ButtonStyle,
    ChannelType,
    ComponentType,
    OverwriteType,
    PermissionFlagsBits
} from "@discordjs/core";
import { type ReportsSettings, ReportCategory } from "@prisma/client";
import type { Application } from "../../../../Application.js";
import type { UpdatableInteraction } from "@barry/core";

import {
    ConfigurableModule,
    GuildSettingOptionBuilder,
    GuildSettingType
} from "../../../../ConfigurableModule.js";
import {
    LocalReportRepository,
    ReportRepository,
    ReportsSettingsRepository
} from "./database/index.js";
import {
    REPORT_DEFAULT_REQUEST_REASONS,
    REPORT_DEFAULT_PROFILE_REASONS,
    REPORT_CHANNEL_TAGS
} from "./constants.js";

import { ModifyGuildSettingHandlers } from "../../../general/commands/chatinput/config/handlers.js";
import { REPORT_CHANNEL_GUIDELINES } from "./content.js";
import { loadEvents } from "../../../../utils/loadFolder.js";
import { timeoutContent } from "../../../../common.js";
import config from "../../../../config.js";

/**
 * Represents buttons for managing reports.
 */
export enum ReportActionButton {
    View = "view_report",
    Action = "action_report"
}

/**
 * Represents the reports module.
 */
export default class ReportsModule extends ConfigurableModule<ReportsSettings> {
    /**
     * Represents a repository for managing local reports.
     */
    localReports: LocalReportRepository;

    /**
     * Represents a repository for managing reports.
     */
    reports: ReportRepository;

    /**
     * Represents a repository for managing settings of this module.
     */
    settings: ReportsSettingsRepository;

    /**
     * Represents the reports module.
     *
     * @param client The client that initialized the module.
     */
    constructor(client: Application) {
        super(client, {
            id: "reports",
            name: "Reports",
            description: "Allows users to report other users in the marketplace.",
            events: loadEvents("./events")
        });

        this.localReports = new LocalReportRepository(client.prisma);
        this.reports = new ReportRepository(client.prisma);
        this.settings = new ReportsSettingsRepository(client.prisma);

        this.defineConfig({
            settings: {
                channelID: GuildSettingOptionBuilder.custom({
                    base: GuildSettingType.Channel,
                    callback: this.handleChannel.bind(this),
                    description: "The channel where reports are posted.",
                    name: "Reports Channel",
                    nullable: true
                })
            }
        });
    }

    /**
     * Creates a channel for reports.
     *
     * @param guildID The ID of the guild to create the channel for.
     */
    async createChannel(guildID: string): Promise<void> {
        const channel = await this.client.api.guilds.createChannel(guildID, {
            available_tags: REPORT_CHANNEL_TAGS.map((tag) => ({
                emoji_id: null,
                emoji_name: null,
                id: "",
                moderated: true,
                name: tag
            })),
            name: "reports",
            permission_overwrites: [{
                deny: PermissionFlagsBits.ViewChannel.toString(),
                id: guildID,
                type: OverwriteType.Role
            }],
            topic: REPORT_CHANNEL_GUIDELINES,
            type: ChannelType.GuildForum
        }) as APIGuildForumChannel;

        await this.settings.upsert(guildID, {
            channelID: channel.id,
            tagAccepted: channel.available_tags[1].id,
            tagCopyright: channel.available_tags[6].id,
            tagFalseInformation: channel.available_tags[5].id,
            tagIgnored: channel.available_tags[2].id,
            tagInappropriate: channel.available_tags[3].id,
            tagOpen: channel.available_tags[0].id,
            tagOther: channel.available_tags[7].id,
            tagScamsFraud: channel.available_tags[4].id
        });
    }

    /**
     * Returns the category for the specified reason.
     *
     * @param reason The reason to get the category for.
     * @returns The category for the specified reason.
     */
    getCategoryFromReason(reason: string): ReportCategory {
        for (const [category, reasons] of Object.entries(REPORT_DEFAULT_REQUEST_REASONS)) {
            if (reasons.includes(reason)) {
                return category as ReportCategory;
            }
        }

        for (const [category, reasons] of Object.entries(REPORT_DEFAULT_PROFILE_REASONS)) {
            if (reasons.includes(reason)) {
                return category as ReportCategory;
            }
        }

        return ReportCategory.Other;
    }

    /**
     * Returns the configured ID of the tag corresponding the specified category.
     *
     * @param settings The settings of the guild.
     * @param category The category to get the tag for.
     * @returns The ID of the tag corresponding the specified category, if configured.
     */
    getTagFromCategory(settings: ReportsSettings, category: ReportCategory): string | null {
        switch (category) {
            case ReportCategory.Copyright:
                return settings.tagCopyright;
            case ReportCategory.FalseInformation:
                return settings.tagFalseInformation;
            case ReportCategory.Inappropriate:
                return settings.tagInappropriate;
            case ReportCategory.ScamsFraud:
                return settings.tagScamsFraud;
            case ReportCategory.Other:
                return settings.tagOther;
            default:
                return null;
        }
    }

    /**
     * Handles updating the channel setting.
     *
     * @param interaction The interaction that triggered the option.
     * @param settings The settings of the guild.
     */
    async handleChannel(interaction: UpdatableInteraction, settings: ReportsSettings): Promise<void> {
        await interaction.editParent({
            components: [{
                components: [{
                    custom_id: "new_channel",
                    label: "New Channel",
                    style: ButtonStyle.Success,
                    type: ComponentType.Button
                }, {
                    custom_id: "existing_channel",
                    label: "Existing Channel",
                    style: ButtonStyle.Secondary,
                    type: ComponentType.Button
                }],
                type: ComponentType.ActionRow
            }],
            content: "Would you like to create a new channel for reports, or use an existing one?"
        });

        const response = await interaction.awaitMessageComponent({
            customIDs: ["new_channel", "existing_channel"]
        });

        if (response === undefined) {
            return interaction.editParent(timeoutContent);
        }

        if (response.data.customID === "new_channel") {
            if (!response.isInvokedInGuild()) {
                return;
            }

            if ((response.appPermissions! & PermissionFlagsBits.ManageChannels) === 0n) {
                return response.editParent({
                    components: [],
                    content: `${config.emotes.error} I do not have permission to create channels.`
                });
            }

            await response.deferUpdate();
            await this.createChannel(response.guildID);
        }

        if (response.data.customID === "existing_channel") {
            const handler = new ModifyGuildSettingHandlers<ReportsModule, ReportsSettings>(this);
            await handler.channel(response, settings, {
                channelTypes: [ChannelType.GuildForum],
                description: "The channel where reports are posted.",
                key: "channelID",
                name: "Reports Channel",
                nullable: true,
                repository: this.settings,
                type: GuildSettingType.Channel
            });
        }
    }

    /**
     * Checks if the guild has enabled this module.
     *
     * @returns Whether the guild has enabled this module.
     */
    isEnabled(): boolean {
        return true;
    }
}
