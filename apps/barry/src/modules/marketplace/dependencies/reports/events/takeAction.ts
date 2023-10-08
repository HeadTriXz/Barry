import {
    type AnyInteraction,
    type UpdatableInteraction,
    Event
} from "@barry/core";
import type { BaseModerationModule } from "../../../../../types/moderation.js";
import type { BlacklistableModule } from "../../../../../types/blacklist.js";
import type { LocalReportWithReport } from "../database/LocalReportRepository.js";
import type { PartialGuildMember } from "../../../../moderation/functions/permissions.js";
import type ReportsModule from "../index.js";

import {
    ComponentType,
    GatewayDispatchEvents,
    MessageFlags,
    TextInputStyle
} from "@discordjs/core";
import {
    REPORT_BASE_ACTIONS,
    REPORT_GLOBAL_ACTIONS,
    REPORT_LOCAL_ACTIONS,
    ReportAction
} from "../constants.js";

import { ReportActionButton } from "../index.js";
import { ReportStatus } from "@prisma/client";
import { timeoutContent } from "../../../../../common.js";
import config from "../../../../../config.js";

/**
 * Represents an event handler for taking action on a report.
 */
export default class extends Event<ReportsModule> {
    /**
     * Represents an event handler for taking action on a report.
     *
     * @param module The module the event belongs to.
     */
    constructor(module: ReportsModule) {
        super(module, GatewayDispatchEvents.InteractionCreate);
    }

    /**
     * Takes action on a report.
     *
     * @param interaction The interaction that triggered 'Take Action' button.
     */
    async execute(interaction: AnyInteraction): Promise<void> {
        const isValidInteraction = interaction.isInvokedInGuild()
            && interaction.isMessageComponent()
            && interaction.data.isButton()
            && interaction.data.customID === ReportActionButton.Action;

        if (!isValidInteraction) {
            return;
        }

        const report = await this.module.localReports.getByThread(interaction.message.id, true);
        if (report === null) {
            return interaction.createMessage({
                content: "Failed to find the report you're looking for.",
                flags: MessageFlags.Ephemeral
            });
        }

        const guilds = process.env.MODERATOR_GUILDS?.trim().split(/\s*,\s*/);
        const moderation = this.client.modules.get<BaseModerationModule>("moderation");
        const options = guilds?.includes(interaction.guildID)
            ? REPORT_GLOBAL_ACTIONS
            : await moderation?.isEnabled(interaction.guildID)
                ? REPORT_LOCAL_ACTIONS
                : REPORT_BASE_ACTIONS;

        await interaction.createMessage({
            components: [{
                components: [{
                    custom_id: "select_action",
                    options: options,
                    placeholder: "What action would you like to take?",
                    type: ComponentType.StringSelect
                }],
                type: ComponentType.ActionRow
            }],
            content: `${config.emotes.add} Please select an action to take on this report.`,
            flags: MessageFlags.Ephemeral
        });

        const response = await interaction.awaitMessageComponent({
            customIDs: ["select_action"]
        });

        if (!response?.data.isStringSelect()) {
            return interaction.editParent(timeoutContent);
        }

        switch (response.data.values[0]) {
            case ReportAction.Blacklist:
            case ReportAction.BlacklistReporter: {
                return this.handleBlacklist(response, report, response.data.values[0]);
            }
            case ReportAction.Ban:
            case ReportAction.DWC:
            case ReportAction.Kick:
            case ReportAction.Warn:
            case ReportAction.WarnReporter: {
                return this.handleModerationAction(response, report, response.data.values[0]);
            }
            case ReportAction.Mute: {
                return this.handleMute(response, report);
            }
            case ReportAction.Ignore: {
                await response.editParent({
                    components: [],
                    content: `${config.emotes.check} The report has been ignored.`
                });
                return this.#updateStatus(report, ReportStatus.Ignored);
            }
            case ReportAction.None: {
                await response.editParent({
                    components: [],
                    content: `${config.emotes.check} The report has been marked as resolved.`
                });
                return this.#updateStatus(report, ReportStatus.Accepted);
            }
        }
    }

    /**
     * Handles a blacklist action on a report.
     *
     * @param interaction The interaction that triggered the action.
     * @param report The report to take action on.
     * @param action The action to take.
     */
    async handleBlacklist(
        interaction: UpdatableInteraction,
        report: LocalReportWithReport,
        action: ReportAction
    ): Promise<void> {
        if (!interaction.isInvokedInGuild()) {
            return;
        }

        const developers = this.client.modules.get<BlacklistableModule>("developers");
        if (developers === undefined) {
            return;
        }

        const userID = action === ReportAction.BlacklistReporter
            ? report.report.creatorID
            : report.report.userID;

        const isBlacklisted = await developers.blacklistedUsers.isBlacklisted(userID);
        if (isBlacklisted) {
            return interaction.editParent({
                components: [],
                content: `${config.emotes.error} The user is already blacklisted.`
            });
        }

        await developers.blacklistedUsers.blacklist(userID);

        await interaction.editParent({
            components: [],
            content: `${config.emotes.check} Successfully blacklisted <@${userID}>.`
        });

        await this.#updateStatus(report, ReportStatus.Accepted);
    }

    /**
     * Handles a moderation action on a report.
     *
     * @param interaction The interaction that triggered the action.
     * @param report The report to take action on.
     * @param action The action to take.
     */
    async handleModerationAction(
        interaction: UpdatableInteraction,
        report: LocalReportWithReport,
        action: ReportAction
    ): Promise<void> {
        if (!interaction.isInvokedInGuild()) {
            return;
        }

        const moderation = this.client.modules.get<BaseModerationModule>("moderation");
        if (moderation === undefined) {
            return;
        }

        const userID = action === ReportAction.WarnReporter
            ? report.report.creatorID
            : report.report.userID;

        const member = await this.client.api.guilds
            .getMember(interaction.guildID, userID)
            .catch(() => undefined) as PartialGuildMember | undefined;
        const user = member?.user || await this.client.api.users.get(userID);

        const key = `${Date.now()}-reason`;
        await interaction.createModal({
            components: [{
                components: [{
                    custom_id: "reason",
                    label: "Reason",
                    placeholder: "Enter the reason for this action.",
                    style: TextInputStyle.Short,
                    type: ComponentType.TextInput,
                    value: report.report.reason
                }],
                type: ComponentType.ActionRow
            }],
            custom_id: key,
            title: "Reason"
        });

        const response = await interaction.awaitModalSubmit(key);
        if (response === undefined) {
            return interaction.editParent(timeoutContent);
        }

        const reason = response.values.reason;
        switch (action) {
            case ReportAction.Ban: {
                await moderation?.actions.ban(response, { member, reason, user });
                break;
            }
            case ReportAction.DWC: {
                await moderation?.actions.dwc(response, { member, reason, user });
                break;
            }
            case ReportAction.Kick: {
                if (member === undefined) {
                    return response.editParent({
                        components: [],
                        content: `${config.emotes.error} Failed to find the user to kick.`
                    });
                }

                await moderation?.actions.kick(response, { member, reason });
                break;
            }
            case ReportAction.Warn:
            case ReportAction.WarnReporter: {
                if (member === undefined) {
                    return response.editParent({
                        components: [],
                        content: `${config.emotes.error} Failed to find the user to warn.`
                    });
                }

                await moderation?.actions.warn(response, { member, reason });
                break;
            }
        }

        await this.#updateStatus(report, ReportStatus.Accepted);
    }

    /**
     * Handles a mute action on a report.
     *
     * @param interaction The interaction that triggered the action.
     * @param report The report to take action on.
     */
    async handleMute(interaction: UpdatableInteraction, report: LocalReportWithReport): Promise<void> {
        if (!interaction.isInvokedInGuild()) {
            return;
        }

        const moderation = this.client.modules.get<BaseModerationModule>("moderation");
        if (moderation === undefined) {
            return;
        }

        const member = await this.client.api.guilds
            .getMember(interaction.guildID, report.report.userID)
            .catch(() => undefined) as PartialGuildMember | undefined;

        if (member === undefined) {
            return interaction.editParent({
                components: [],
                content: `${config.emotes.error} Failed to find the user to mute.`
            });
        }

        const key = `${Date.now()}-mute-reason`;
        await interaction.createModal({
            components: [
                {
                    components: [{
                        custom_id: "reason",
                        label: "Reason",
                        placeholder: "Enter the reason for this mute.",
                        style: TextInputStyle.Short,
                        type: ComponentType.TextInput,
                        value: report.report.reason
                    }],
                    type: ComponentType.ActionRow
                },
                {
                    components: [{
                        custom_id: "duration",
                        label: "Duration",
                        placeholder: "Enter the duration of the mute (e.g., 5m, 1h 30m, 1 hour).",
                        style: TextInputStyle.Short,
                        type: ComponentType.TextInput
                    }],
                    type: ComponentType.ActionRow
                }
            ],
            custom_id: key,
            title: "Mute Reason"
        });

        const response = await interaction.awaitModalSubmit(key);
        if (response === undefined) {
            return interaction.editParent(timeoutContent);
        }

        const { duration, reason } = response.values;
        await moderation.actions.mute(response, { duration, member, reason });

        await this.#updateStatus(report, ReportStatus.Accepted);
    }

    /**
     * Updates the status of a report.
     *
     * @param report The report to update the status for.
     * @param status The new status of the report.
     */
    async #updateStatus(report: LocalReportWithReport, status: ReportStatus): Promise<void> {
        const settings = await this.module.settings.getOrCreate(report.guildID);
        const tagID = status === ReportStatus.Accepted
            ? settings.tagAccepted
            : settings.tagIgnored;

        const tags = [tagID];
        const category = this.module.getTagFromCategory(settings, report.report.category);
        if (category !== null) {
            tags.push(category);
        }

        await this.client.api.channels.edit(report.threadID, {
            // @ts-expect-error - The typings are incorrect. Update @discordjs/core.
            applied_tags: tags,
            archived: true
        });

        await this.module.localReports.update(report.guildID, report.id, { status });
    }
}
