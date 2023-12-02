import type {
    APIEmbedField,
    APIInteractionResponseCallbackData,
    APIUser
} from "@discordjs/core";
import type { Case, CaseNote } from "@prisma/client";

import { CASE_EMOJIS, CASE_TITLES } from "../../../constants.js";
import { getAvatarURL } from "@barry-bot/core";
import config from "../../../../../config.js";

/**
 * Get the content for a case.
 *
 * @param entity The case to get the content for.
 * @param notes The notes for the case.
 * @param creator The creator of the case.
 * @param user The user that the case is for.
 * @returns The content for the case.
 */
export function getCaseContent(
    entity: Case,
    notes: CaseNote[],
    creator: APIUser,
    user: APIUser
): APIInteractionResponseCallbackData {
    const title = CASE_TITLES[entity.type];
    const emoji = CASE_EMOJIS[entity.type];

    const fields: APIEmbedField[] = [];
    if (notes.length > 0) {
        fields.push({
            name: "**Notes**",
            value: notes
                .map((n) => `\`${n.id}\` <@${n.creatorID}> — <t:${Math.trunc(n.createdAt.getTime() / 1000)}:R>\n${n.content}`)
                .join("\n\n")
        });
    }

    return {
        embeds: [{
            author: {
                icon_url: getAvatarURL(user, { size: 128 }),
                name: user.username
            },
            color: config.defaultColor,
            description: `**Target:** <@${entity.userID}> \`${user.username}\``
                + `\n**Creator:** <@${entity.creatorID}> \`${creator.username}\``
                + `\n**Date:** <t:${Math.trunc(entity.createdAt.getTime() / 1000)}:R>`,
            fields: fields,
            footer: {
                text: `User ID: ${entity.userID}`
            },
            thumbnail: {
                url: getAvatarURL(user, { size: 256 })
            },
            timestamp: entity.createdAt.toISOString(),
            title: `${emoji} ${title} | Inspecting case #${entity.id}`
        }]
    };
}
