/**
 * Utility class used to easily access emojis in the config.
 */
class Emoji {
    /**
     * Whether the emoji is animated.
     */
    animated: boolean;

    /**
     * The ID of the emoji.
     */
    id: string;

    /**
     * The name of the emoji.
     */
    name: string;

    /**
     * Utility class used to easily access emojis in the config.
     *
     * @param name The name of the emoji.
     * @param id The ID of the emoji.
     * @param animated Whether the emoji is animated.
     */
    constructor(name: string, id: string, animated = false) {
        this.animated = animated;
        this.name = name;
        this.id = id;
    }

    /**
     * The URL of the image of the emoji.
     */
    get imageURL(): string {
        return `https://cdn.discordapp.com/emojis/${this.id}.webp`;
    }

    /**
     * Returns the formatted emoji to use in Discord.
     */
    toString(): string {
        return `<${this.animated ? "a" : ""}:${this.name}:${this.id}>`;
    }
}

export default {
    emotes: {
        bing: new Emoji("bing", "1127741749016657980"),
        check: new Emoji("check", "1004436175307669659"),
        error: new Emoji("error", "1004436176859578510"),
        googleLens: new Emoji("googlelens", "1127735623948705852"),
        next: new Emoji("next", "1124406938738905098"),
        previous: new Emoji("previous", "1124406936188768357"),
        yandex: new Emoji("yandex", "1005213772199251988")
    },
    defaultColor: 0xFFC331,
    embedColor: 0x2F3136
};
