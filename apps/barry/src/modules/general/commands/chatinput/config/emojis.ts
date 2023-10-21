import emojis from "emojilib/dist/emoji-en-US.json" assert { type: "json" };

/**
 * A map with keywords and their respective emojis.
 */
const emojiMap = new Map<string, string>();
for (const [key, values] of Object.entries(emojis)) {
    for (const value of values) {
        emojiMap.set(value, key);
    }
}

export { emojiMap };
