/**
 * Utility class used to easily access emojis in the config.
 */
export class Emoji {
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
        add: new Emoji("add", "1013212104628645888"),
        available: new Emoji("check", "1004436175307669659"),
        bing: new Emoji("bing", "1127741749016657980"),
        busy: new Emoji("busy", "1138853050539323584"),
        check: new Emoji("check", "1004436175307669659"),
        error: new Emoji("error", "1004436176859578510"),
        googleLens: new Emoji("googlelens", "1127735623948705852"),
        loading: new Emoji("loading", "1135668500728397855", true),
        menu: new Emoji("hamburger", "1136294229405077564"),
        next: new Emoji("next", "1124406938738905098"),
        previous: new Emoji("previous", "1124406936188768357"),
        unavailable: new Emoji("unavailable", "1138853052460322897"),
        yandex: new Emoji("yandex", "1005213772199251988")
    },
    defaultColor: 0xFFC331,
    embedColor: 0x2B2D31
};
