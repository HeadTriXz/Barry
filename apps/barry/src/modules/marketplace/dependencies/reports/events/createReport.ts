import {
    type AnyInteraction,
    type Module,
    Event
} from "@barry/core";
import type ReportsModule from "../index.js";

import {
    ComponentType,
    GatewayDispatchEvents,
    MessageFlags,
    TextInputStyle
} from "@discordjs/core";
import {
    REPORT_CATEGORY_TITLE,
    REPORT_DEFAULT_PROFILE_REASONS,
    REPORT_DEFAULT_REQUEST_REASONS
} from "../constants.js";
import { ReportCategory, ReportType } from "@prisma/client";

import { DiscordAPIError } from "@discordjs/rest";
import { ProfileActionButton } from "../../profiles/index.js";
import { RequestActionButton } from "../../requests/index.js";
import { getReportContent } from "../content.js";
import { timeoutContent } from "../../../constants.js";
import config from "../../../../../config.js";

/**
 * The data required to create a report.
 */
export interface CreateReportData {
    /**
     * The ID of the report.
     */
    id?: number;

    /**
     * The ID of the user.
     */
    userID: string;
}

/**
 * Represents a module which can load data for an entity.
 */
export type ModuleWithData<K extends "profiles" | "requests"> = Module & {
    /**
     * Represents the repository for the entity.
     */
    [key in K]: {
        /**
         * Gets the entity by its message ID.
         *
         * @param messageID The ID of the message to get the entity for.
         * @returns The entity for the message.
         */
        getByMessage(messageID: string): Promise<CreateReportData | null>;
    };
};

/**
 * Represents an event handler for creating a report.
 */
export default class extends Event<ReportsModule> {
    /**
     * Represents an event handler for creating a report.
     *
     * @param module The module the event belongs to.
     */
    constructor(module: ReportsModule) {
        super(module, GatewayDispatchEvents.InteractionCreate);
    }

    /**
     * Creates a new report.
     *
     * @param interaction The interaction that triggered 'Report' button.
     */
    async execute(interaction: AnyInteraction): Promise<void> {
        const isValidInteraction = interaction.isInvokedInGuild()
            && interaction.isMessageComponent()
            && interaction.data.isButton()
            && (
                interaction.data.customID === ProfileActionButton.Report ||
                interaction.data.customID === RequestActionButton.Report
            );

        if (!isValidInteraction) {
            return;
        }

        const type = interaction.data.customID === ProfileActionButton.Report
            ? ReportType.Profile
            : ReportType.Request;

        const entity: CreateReportData | null | undefined = type === ReportType.Profile
            ? await this.client.modules.get<ModuleWithData<"profiles">>("marketplace.profiles")?.profiles.getByMessage(interaction.message.id)
            : await this.client.modules.get<ModuleWithData<"requests">>("marketplace.requests")?.requests.getByMessage(interaction.message.id);

        if (entity?.userID === undefined) {
            return interaction.createMessage({
                content: `${config.emotes.error} An error occurred while reporting this user.`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (entity.userID === interaction.user.id) {
            return interaction.createMessage({
                content: `${config.emotes.error} You cannot report yourself.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const previousReport = await this.module.localReports.getByCreator(interaction.user.id, interaction.message.id);
        if (previousReport !== null) {
            return interaction.createMessage({
                content: `${config.emotes.error} You have already reported this user.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const baseReasons = type === ReportType.Profile
            ? REPORT_DEFAULT_PROFILE_REASONS
            : REPORT_DEFAULT_REQUEST_REASONS;

        const defaultReasons = Object.entries(baseReasons).flatMap(([category, values]) => values.map((reason) => ({
            description: REPORT_CATEGORY_TITLE[category as ReportCategory],
            label: reason,
            value: reason
        })));

        await interaction.createMessage({
            components: [{
                components: [{
                    custom_id: "report_reason_select",
                    options: [...defaultReasons, {
                        description: "Please specify a reason for this report.",
                        label: "Other",
                        value: ReportCategory.Other
                    }],
                    placeholder: "What is the reason for this report?",
                    type: ComponentType.StringSelect
                }],
                type: ComponentType.ActionRow
            }],
            content: `${config.emotes.add} Please select a reason for this report.`,
            flags: MessageFlags.Ephemeral
        });

        const response = await interaction.awaitMessageComponent({
            customIDs: ["report_reason_select"]
        });

        if (!response?.data.isStringSelect()) {
            return interaction.editParent(timeoutContent);
        }

        let reason = response.data.values[0];
        if (reason === ReportCategory.Other) {
            const id = `${Date.now()}-report-reason`;
            await response.createModal({
                components: [{
                    components: [{
                        custom_id: "reason",
                        label: "Reason",
                        placeholder: "Enter the reason for this report.",
                        style: TextInputStyle.Short,
                        type: ComponentType.TextInput
                    }],
                    type: ComponentType.ActionRow
                }],
                custom_id: id,
                title: "Report Reason"
            });

            const customResponse = await response.awaitModalSubmit(id);
            if (customResponse === undefined) {
                return response.editParent(timeoutContent);
            }

            await customResponse.deferUpdate();
            reason = customResponse.values.reason;
        }

        const report = await this.module.reports.create({
            category: this.module.getCategoryFromReason(reason),
            creatorID: interaction.user.id,
            guildID: interaction.guildID,
            reason: reason,
            requestID: entity.id,
            type: type,
            userID: entity.userID
        });

        const user = await this.client.api.users.get(entity.userID);
        const guilds = [interaction.guildID, ...(process.env.MODERATOR_GUILDS?.trim().split(/\s*,\s*/) ?? [])];
        for (const guildID of guilds) {
            const acceptedReports = await this.module.localReports.getAccepted(guildID, entity.userID);
            const localID = await this.module.localReports.nextInSequence(guildID);

            const content = getReportContent({
                acceptedReports: acceptedReports,
                creator: interaction.user,
                localReportID: localID,
                report: report,
                user: user
            });

            const settings = await this.module.settings.getOrCreate(guildID);
            if (settings.channelID !== null) {
                try {
                    const tags: string[] = [];
                    if (settings.tag_open !== null) {
                        tags.push(settings.tag_open);
                    }

                    const tagID = this.module.getTagFromCategory(settings, report.category);
                    if (tagID !== null) {
                        tags.push(tagID);
                    }

                    const thread = await this.client.api.channels.createForumThread(settings.channelID, {
                        applied_tags: tags,
                        message: content,
                        name: `#${localID} - ${user.username}`
                    });

                    await this.module.localReports.create({
                        guildID: guildID,
                        id: localID,
                        reportID: report.id,
                        threadID: thread.id
                    });
                } catch (error: unknown) {
                    if (error instanceof DiscordAPIError && error.code === 10003) {
                        await this.module.settings.upsert(guildID, {
                            channelID: null
                        });
                    }

                    this.client.logger.error(error);
                }
            }
        }

        await response.editParent({
            components: [],
            content: `${config.emotes.check} Your report has been filed.`
        });
    }
}
