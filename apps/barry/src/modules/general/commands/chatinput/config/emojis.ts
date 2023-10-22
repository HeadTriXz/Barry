import type { APIPartialEmoji } from "@discordjs/core";
import emojis from "emojilib/emojis.json" assert { type: "json" };

/**
 * A map with keywords and their respective emojis.
 */
const emojiMap = new Map<string, string>();
for (const [key, emoji] of Object.entries(emojis)) {
    emojiMap.set(key, emoji.char);
}

/**
 * Normalize the provided emoji.
 *
 * @param emoji The emoji to normalize.
 * @returns The normalized emoji.
 */
export function normalizeEmoji(emoji: string): string {
    emoji = emoji.trim();

    if (/^:\w+:$/.test(emoji)) {
        return emoji.slice(1, -1);
    }

    return emoji;
}

/**
 * Parse (custom) emojis in the provided text.
 *
 * @param text The text to parse.
 */
export function getEmoji(text: string): APIPartialEmoji | null {
    const normalized = normalizeEmoji(text);
    const standardEmoji = emojiMap.get(normalized);
    if (standardEmoji !== undefined) {
        return {
            animated: false,
            id: null,
            name: standardEmoji
        };
    }

    const unicode = text.match(/\p{Emoji_Presentation}/u);
    if (unicode !== null) {
        return {
            animated: false,
            id: null,
            name: unicode[0]
        };
    }

    const match = text.match(/<?(?:(a):)?(\w{2,32}):(\d{17,19})?>?/);
    if (match === null) {
        return null;
    }

    return {
        animated: match[1] === "a",
        id: match[3],
        name: match[2]
    };
}
