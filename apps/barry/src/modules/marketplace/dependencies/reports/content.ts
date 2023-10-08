import {
    type APIEmbedField,
    type APIInteractionResponseCallbackData,
    type APIUser,
    ComponentType,
    ButtonStyle
} from "@discordjs/core";
import { type Report, ReportType } from "@prisma/client";
import type { LocalReportWithReport } from "./database/index.js";

import { REPORT_CATEGORY_TITLE } from "./constants.js";
import { ReportActionButton } from "./index.js";
import { getAvatarURL } from "@barry/core";
import config from "../../../../config.js";

/**
 * The guidelines for the reports channel.
 */
export const REPORT_CHANNEL_GUIDELINES = `
# Reports Channel
Welcome to the reports channel! This channel is a crucial part of maintaining a safe and positive environment within the marketplace. Here, you will receive reports from our users regarding various issues they encounter. To ensure effective moderation, please follow these guidelines:

## Report Types
Here are some common report types you may encounter:
1. **Inappropriate Content**: Reports related to explicit, offensive, or inappropriate content that violates your community guidelines.
2. **Scams and Fraud**: Reports concerning users involved in scams, phishing, or fraudulent activities.
3. **False Information**: Reports highlighting profiles or requests that provide false or misleading information about the user or the content.
4. **Copyright Violation**: Reports of profiles or requests using copyrighted content without proper permission or attribution.
5. **Other**: Miscellaneous reports that don't fit the above categories. These may require further investigation.

## Handling Reports
1. **Evaluate**: Carefully review the report, including any attached evidence or context.
2. **Investigate**: If necessary, investigate further by reaching out to the involved parties or checking additional information.
3. **Take Action**: Depending on the severity and validity of the report, take appropriate actions such as warnings, mutes, kicks, bans, or other moderation actions.
4. **Document**: Keep a record of your actions and the reasons for them. This documentation is essential for accountability.

## Deal With Caution (DWC)
Deal With Caution (DWC) is a special moderation action taken in cases where a user's behavior raises concerns but may not warrant an immediate ban.
### When To Use DWC
- **Suspicion but Not Certainty**: DWC should be used when there are suspicions or concerns about a user's behavior, but clear evidence of wrongdoing is lacking.
- **Multiple Reports**: When multiple reports are filed against a user for similar reasons, and a pattern of concerning behavior emerges.
### What Does It Do?
- **User Notification**: The user in question will receive a notification explaining the concerns and reasons for DWC. They will have an opportunity to address and resolve these concerns.
- **Community Notification**: To maintain transparency and ensure the safety of your community, the reason for placing a user under DWC will be displayed on the user's profiles and requests.
- **Temporary Blacklist**: The user will be temporarily blacklisted from using the marketplace while DWC is in effect.
- **Resolution Period**: DWC typically lasts for a specific duration (e.g., one week) during which the user can work on resolving the issues.
- **Actions to Resolve**: During this period, the user is encouraged to take actions that address the concerns raised in the reports.
- **Follow-up and Monitoring**: Moderators will follow up with the user to monitor their progress in resolving the issues.
### After Resolution Period
If, after the DWC period, the concerns have not been adequately addressed or if the user's behavior remains problematic, the user will automatically be banned.`;

/**
 * Options for the getReportContent function.
 */
export interface ReportOptions {
    /**
     * Previously accepted reports for the user.
     */
    acceptedReports: LocalReportWithReport[];

    /**
     * The user who created the report.
     */
    creator: APIUser;

    /**
     * The ID of the local report.
     */
    localReportID: number;

    /**
     * The report to get the content for.
     */
    report: Report;

    /**
     * The user who the report is targeting.
     */
    user: APIUser;
}

/**
 * Generates the content for a report.
 *
 * @param options The options for the report.
 * @returns The content for the report.
 */
export function getReportContent(options: ReportOptions): APIInteractionResponseCallbackData {
    const fields: APIEmbedField[] = [{
        name: "**Reason**",
        value: options.report.reason
    }];

    if (options.acceptedReports.length > 0) {
        fields.push({
            name: "**Previous Reports**",
            value: `The user has previously received \`${options.acceptedReports.length}\` reports:\n\n`
                + options.acceptedReports
                    .map((report) => `[#${report.id} - ${REPORT_CATEGORY_TITLE[report.report.category]}](https://discord.com/channels/${report.guildID}/${report.threadID}/${report.threadID})`)
                    .join(", ")
        });
    }

    return {
        components: [{
            components: [
                {
                    custom_id: ReportActionButton.View,
                    emoji: {
                        id: config.emotes.view.id,
                        name: config.emotes.view.name
                    },
                    label: options.report.type === ReportType.Profile
                        ? "View Profile"
                        : "View Request",
                    style: ButtonStyle.Secondary,
                    type: ComponentType.Button
                },
                {
                    custom_id: ReportActionButton.Action,
                    emoji: {
                        id: config.emotes.action.id,
                        name: config.emotes.action.name
                    },
                    label: "Take Action",
                    style: ButtonStyle.Secondary,
                    type: ComponentType.Button
                }
            ],
            type: ComponentType.ActionRow
        }],
        content: `### A new report has been filed against <@${options.user.id}>`,
        embeds: [{
            author: {
                name: options.user.username,
                icon_url: getAvatarURL(options.user)
            },
            color: config.defaultColor,
            description: `**Target:** <@${options.user.id}> \`${options.user.username}\`\n`
                + `**Creator:** <@${options.creator.id}> \`${options.creator.username}\``,
            fields: fields,
            footer: {
                text: `User ID: ${options.user.id}`
            },
            timestamp: options.report.createdAt.toISOString(),
            title: `${REPORT_CATEGORY_TITLE[options.report.category]} | Report #${options.localReportID}`
        }]
    };
}
