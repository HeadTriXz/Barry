import type { ModalSubmitInteraction } from "@barry/core";
import type { Prisma } from "@prisma/client";

import { MessageFlags } from "@discordjs/core";
import config from "../../../../../../config.js";

/**
 * Regular expression to match Discord invite links.
 */
export const INVITE_REGEX = /(?:discord\.(?:gg|io|me|plus)|discord(?:app)?\.com\/invite|invite\.(?:gg|ink))\/[\w-]{2,}/i;

/**
 * Regular expression to match URLs.
 */
export const URL_REGEX = /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w.-]+)+[\w\-._~:/?#[\]@!$&'()*+,;=.]+$/i;

/**
 * Capitalizes the first letter of each sentence in a string.
 *
 * @param value The input string to be capitalized.
 * @returns The input string with each sentence's first letter capitalized.
 */
export function capitalizeEachSentence(value: string): string {
    const sentences = value.trim().split(/[.!?]\s+/);
    const capitalizedSentences = sentences.map((sentence) => {
        return sentence.charAt(0).toUpperCase() + sentence.slice(1);
    });

    return capitalizedSentences.join(". ");
}

/**
 * Capitalizes the first letter of each word in a string.
 *
 * @param value The input string to be capitalized.
 * @returns The input string with each word's first letter capitalized.
 */
export function capitalizeEachWord(value: string): string {
    const words = value.trim().split(/\s+/);
    const capitalizedWords = words.map((word) => {
        return word.charAt(0).toUpperCase() + word.slice(1);
    });

    return capitalizedWords.join(" ");
}

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
