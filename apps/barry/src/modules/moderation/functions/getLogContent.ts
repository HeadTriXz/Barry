import type {
    APIEmbed,
    APIInteractionResponseCallbackData,
    APIUser
} from "@discordjs/core";
import { type Case, CaseType } from "@prisma/client";

import { getAvatarURL } from "@barry/core";
import config, { type Emoji } from "../../../config.js";

/**
 * Options for the getLogContent function.
 */
export interface CaseLogOptions {
    /**
     * The case to get the log content for.
     */
    case: Case;

    /**
     * The user who created the case.
     */
    creator: APIUser;

    /**
     * The duration of the case, if applicable.
     */
    duration?: number;

    /**
     * The reason for the action taken.
     */
    reason: string;

    /**
     * The user who the case is targeting.
     */
    user: APIUser;
}

/**
 * The emojis to use for each case type.
 */
const CASE_EMOJIS: Record<CaseType, Emoji> = {
    [CaseType.Ban]: config.emotes.ban,
    [CaseType.Kick]: config.emotes.kick,
    [CaseType.Mute]: config.emotes.mute,
    [CaseType.Note]: config.emotes.note,
    [CaseType.Unban]: config.emotes.unban,
    [CaseType.Unmute]: config.emotes.unmute,
    [CaseType.Warn]: config.emotes.warn
};

/**
 * The titles to use for each case type.
 */
const CASE_TITLES: Record<CaseType, string> = {
    [CaseType.Ban]: "Ban",
    [CaseType.Kick]: "Kick",
    [CaseType.Mute]: "Mute",
    [CaseType.Note]: "Note",
    [CaseType.Unban]: "Unban",
    [CaseType.Unmute]: "Unmute",
    [CaseType.Warn]: "Warn"
};

/**
 * Generates the log message content for a case.
 *
 * @param options The options for the log content.
 * @returns The content for the log message.
 */
export function getLogContent(options: CaseLogOptions): APIInteractionResponseCallbackData {
    const embed: APIEmbed = {
        author: {
            name: options.user.username,
            icon_url: getAvatarURL(options.user)
        },
        color: config.defaultColor,
        description: `**Target:** <@${options.user.id}> \`${options.user.username}\`\n`
            + `**Creator:** <@${options.creator.id}> \`${options.creator.username}\``,
        fields: [{
            name: "**Note**",
            value: options.reason
        }],
        footer: {
            text: `User ID: ${options.user.id}`
        },
        timestamp: options.case.createdAt.toISOString(),
        title: `${CASE_EMOJIS[options.case.type]} ${CASE_TITLES[options.case.type]} | Case #${options.case.id}`
    };

    if (options.duration !== undefined) {
        embed.fields?.push({
            name: "**Duration**",
            value: `Expires <t:${Math.trunc((options.case.createdAt.getTime() + options.duration) / 1000)}:R>`
        });
    }

    return { embeds: [embed] };
}
