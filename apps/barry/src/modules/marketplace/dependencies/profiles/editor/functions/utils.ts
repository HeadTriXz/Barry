import type { ModalSubmitInteraction } from "@barry-bot/core";
import type { Prisma } from "@prisma/client";

import {
    capitalizeEachSentence,
    capitalizeEachWord
} from "../../../../utils.js";

import { INVITE_REGEX } from "../../../../constants.js";
import { MessageFlags } from "@discordjs/core";
import config from "../../../../../../config.js";

/**
 * Regular expression to match URLs.
 */
export const URL_REGEX = /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w.-]+)+[\w\-._~:/?#[\]@!$&'()*+,;=.]+$/i;

/**
 * Parses user-submitted profile data and formats it.
 *
 * @param interaction The interaction containing the submitted data.
 * @returns The parsed data, or undefined if the data is not valid.
 */
export async function parseProfileData(
    interaction: ModalSubmitInteraction
): Promise<Partial<Prisma.ProfileCreateInput> | void> {
    const { about, links, location, pricing, skills } = interaction.values;
    const containsInvite = INVITE_REGEX.test(about)
        || INVITE_REGEX.test(skills)
        || INVITE_REGEX.test(location)
        || INVITE_REGEX.test(pricing)
        || INVITE_REGEX.test(links);

    if (containsInvite) {
        return interaction.createMessage({
            content: `${config.emotes.error} Your profile may not contain invite links.`,
            flags: MessageFlags.Ephemeral
        });
    }

    const data: Partial<Prisma.ProfileCreateInput> = {};
    data.about = capitalizeEachSentence(about);
    data.links = [];
    data.location = null;
    data.pricing = null;
    data.skills = [];

    if (location.length > 0) {
        data.location = capitalizeEachWord(location);
    }

    if (pricing.length > 0) {
        data.pricing = capitalizeEachSentence(pricing);
    }

    if (skills.length > 0) {
        data.skills = skills
            .split(/[\n,]+/)
            .map((skill) => capitalizeEachWord(skill));
    }

    if (links.length > 0) {
        for (const link of links.split(/[\n,]+/)) {
            const trimmed = link.trim();
            if (!URL_REGEX.test(trimmed)) {
                continue;
            }

            try {
                const url = new URL(prefixURL(trimmed));

                data.links.push(url.origin + url.pathname);
            } catch {}
        }
    }

    return data;
}

/**
 * Prefixes an URL with 'https://' if it isn't already.
 *
 * @param url The URL to prefix.
 * @returns The prefixed URL.
 */
function prefixURL(url: string): string {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        return `https://${url}`;
    }

    return url;
}
