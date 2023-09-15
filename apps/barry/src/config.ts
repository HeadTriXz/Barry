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
        // Moderation
        ban: new Emoji("ban", "1149399269531459616"),
        dwc: new Emoji("dwc", "1151425609487106101"),
        kick: new Emoji("kick", "1149399337412071484"),
        mute: new Emoji("mute", "1149399536381477006"),
        note: new Emoji("note", "1149399622398255188"),
        unban: new Emoji("unban", "1149399596372607127"),
        undwc: new Emoji("undwc", "1151870611203821628"),
        unmute: new Emoji("unmute", "1149399568446914670"),
        warn: new Emoji("warn", "1149399652504977508"),

        // Marketplace
        add: new Emoji("add", "1013212104628645888"),
        available: new Emoji("check", "1004436175307669659"),
        busy: new Emoji("busy", "1138853050539323584"),
        unavailable: new Emoji("unavailable", "1138853052460322897"),

        // Reverse Image Search
        bing: new Emoji("bing", "1127741749016657980"),
        googleLens: new Emoji("googlelens", "1127735623948705852"),
        yandex: new Emoji("yandex", "1005213772199251988"),

        // Other
        check: new Emoji("check", "1004436175307669659"),
        error: new Emoji("error", "1004436176859578510"),
        loading: new Emoji("loading", "1135668500728397855", true),
        menu: new Emoji("hamburger", "1136294229405077564"),
        next: new Emoji("next", "1124406938738905098"),
        previous: new Emoji("previous", "1124406936188768357")
    },
    defaultColor: 0xFFC331,
    defaultDWCColor: 0xFFFF58,
    embedColor: 0x2B2D31
};
