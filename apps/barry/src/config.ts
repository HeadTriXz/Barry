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
        ban: new Emoji("ban", "1263833067324313693"),
        dwc: new Emoji("dwc", "1263833152565280768"),
        kick: new Emoji("kick", "1263833216511643689"),
        mute: new Emoji("mute", "1263833230247985152"),
        note: new Emoji("note", "1263833242335973527"),
        unban: new Emoji("unban", "1263833285864460368"),
        undwc: new Emoji("undwc", "1263833296417194036"),
        unmute: new Emoji("unmute", "1263833325651623946"),
        warn: new Emoji("warn", "1263833335407448157"),

        // Marketplace
        action: new Emoji("action", "1263833048382701579"),
        add: new Emoji("add", "1263833057811763201"),
        available: new Emoji("check", "1263833107602341968"),
        busy: new Emoji("busy", "1263833089235353601"),
        unavailable: new Emoji("unavailable", "1263833275366113291"),
        view: new Emoji("view", "1263833381880467478"),

        // Reverse Image Search
        bing: new Emoji("bing", "1263833078439346310"),
        googleLens: new Emoji("googlelens", "1263833188652814430"),
        yandex: new Emoji("yandex", "1263833350284775525"),

        // Other
        check: new Emoji("check", "1263833107602341968"),
        error: new Emoji("error", "1263833176174887022"),
        menu: new Emoji("hamburger", "1263833201374134442"),
        next: new Emoji("next", "1263833027537276971"),
        previous: new Emoji("previous", "1263833039574925422"),

        // Menu
        channel: new Emoji("channel", "1263833097493811261"),
        close: new Emoji("close", "1263833122747715685"),
        edit: new Emoji("edit", "1263833372086505482"),
        delete: new Emoji("delete", "1263833140422639687"),
        emoji: new Emoji("emoji", "1263833162375626854"),
        role: new Emoji("role", "1263833252897095784"),
        unknown: new Emoji("unknown", "1263833315383840808")
    },
    defaultColor: 0xFFC331,
    defaultDWCColor: 0xFFFF58,
    embedColor: 0x2B2D31
};
