import {
    type ApplicationCommandInteraction,
    type UserCommandTarget,
    UserCommand,
    getAvatarURL
} from "@barry/core";
import {
    type Image,
    Canvas,
    loadFont,
    loadImage
} from "canvas-constructor/napi-rs";

import type { APIUser } from "@discordjs/core";
import type { MemberActivity } from "@prisma/client";
import type LevelingModule from "../../../index.js";

import { join } from "node:path";

/**
 * The background color used in the rank card.
 */
const BACKGROUND_COLOR = "#1E1E1E";

/**
 * The secondary color used in the rank card.
 */
const SECONDARY_COLOR = "#272727";

/**
 * The text color used in the rank card.
 */
const TEXT_COLOR = "#FFFFFF";

/**
 * The subtext color used in the rank card.
 */
const SUBTEXT_COLOR = "#6B6B6B";

/**
 * The divider color used in the rank card.
 */
const DIVIDER_COLOR = "#343434";

/**
 * The accent color used in the rank card.
 */
const ACCENT_COLOR = "#FFC331";

loadFont(join(process.cwd(), "./assets/fonts/Inter-SemiBold.ttf"), "Inter SemiBold");
loadFont(join(process.cwd(), "./assets/fonts/Inter-Regular.ttf"), "Inter");

/**
 * Represents a user command that allows users to view someone's rank card.
 */
export default class extends UserCommand<LevelingModule> {
    /**
     * Represents a user command that allows users to view someone's rank card.
     *
     * @param module The module the command belongs to.
     */
    constructor(module: LevelingModule) {
        super(module, {
            name: "View Rank",
            guildOnly: true
        });
    }

    /**
     * Executes the "View Rank" command.
     *
     * @param interaction The interaction that triggered the command.
     * @param target The resolved data provided with the command.
     */
    async execute(interaction: ApplicationCommandInteraction, { user }: UserCommandTarget): Promise<void> {
        if (!interaction.isInvokedInGuild()) {
            return;
        }

        await interaction.defer();

        const entity = await this.module.memberActivity.getOrCreate(interaction.guildID, user.id);
        const avatar = await loadImage(getAvatarURL(user, { size: 256 }));

        const canvas = new Canvas(1000, 790);

        this.#printBase(canvas);
        this.#printAvatar(canvas, avatar);
        this.#printProgress(canvas, entity);
        this.#printUsername(canvas, user);
        this.#printSubtext(canvas);
        this.#printInfo(canvas, entity);

        const buffer = await canvas.pngAsync();

        await interaction.editOriginalMessage({
            files: [{
                data: buffer,
                name: "rank.png"
            }]
        });
    }

    /**
     * Prints the user's avatar on the rank card.
     *
     * @param canvas The canvas instance.
     * @param avatar The user's avatar.
     */
    #printAvatar(canvas: Canvas, avatar: Image): void {
        canvas
            .setColor(ACCENT_COLOR + "33")
            .printCircle(175, 175, 112)

            .setColor(SECONDARY_COLOR)
            .printCircle(175, 175, 100)
            .printCircularImage(avatar, 175, 175, 90);
    }

    /**
     * Prints the base background and layout of the rank card.
     *
     * @param canvas The canvas instance.
     */
    #printBase(canvas: Canvas): void {
        canvas
            .setColor(BACKGROUND_COLOR)
            .printRoundedRectangle(0, 0, 1000, 790, 90)

            .setColor(SECONDARY_COLOR)
            .printRoundedRectangle(0, 340, 1000, 450, 90)

            .setColor(BACKGROUND_COLOR)
            .printRoundedRectangle(60, 550, 415, 180, 40)
            .printRoundedRectangle(525, 550, 415, 180, 40)

            .setColor(ACCENT_COLOR)
            .printRoundedRectangle(192, 723, 150, 7, 4)
            .printRoundedRectangle(658, 723, 150, 7, 4)

            .setColor(DIVIDER_COLOR)
            .printRoundedRectangle(361, 396, 4, 86, 2)
            .printRoundedRectangle(638, 396, 4, 86, 2);
    }

    /**
     * Prints the user's information on the rank card.
     *
     * @param canvas The canvas instance.
     * @param member The member activity record of the user.
     */
    #printInfo(canvas: Canvas, member: MemberActivity): void {
        canvas
            .setColor(TEXT_COLOR)
            .setTextAlign("center")
            .setTextFont("40px Inter SemiBold")

            .printText(member.reputation.toString(), 185, 440)
            .printText(member.level.toString(), 500, 440)
            .printText(this.module.formatNumber(member.experience), 812, 440)
            .printText(this.module.formatNumber(member.messageCount), 266, 643)
            .printText(this.module.formatNumber(member.voiceMinutes), 733, 643);
    }

    /**
     * Prints the progress bar on the rank card.
     *
     * @param canvas The canvas instance.
     * @param member The member activity record of the user.
     */
    #printProgress(canvas: Canvas, member: MemberActivity): void {
        const currentLevelExp = this.module.calculateExperience(member.level);
        const nextLevelExp = this.module.calculateExperience(member.level + 1);

        const progress = member.experience - currentLevelExp;
        const range = nextLevelExp - currentLevelExp;

        const angle = (progress / range) * 2 * Math.PI;

        canvas
            .beginPath()
            .arc(175, 175, 106, 0, angle)
            .setLineCap("round")
            .setStroke(ACCENT_COLOR)
            .setStrokeWidth(15)
            .stroke();
    }

    /**
     * Prints the subtext on the rank card.
     *
     * @param canvas The canvas instance.
     */
    #printSubtext(canvas: Canvas): void {
        canvas
            .setColor(SUBTEXT_COLOR)
            .setTextAlign("center")
            .setTextFont("24px Inter SemiBold")

            .printText("REPUTATION", 185, 473)
            .printText("LEVEL", 500, 473)
            .printText("EXPERIENCE", 812, 473)
            .printText("MESSAGES", 266, 675)
            .printText("VOICE MINUTES", 733, 675);
    }

    /**
     * Prints the username on the rank card.
     *
     * @param canvas The canvas instance.
     * @param user The user whose card is viewed.
     */
    #printUsername(canvas: Canvas, user: APIUser): void {
        const displayName = user.global_name ?? user.username;
        const username = user.discriminator !== "0"
            ? `#${user.discriminator}`
            : `@${user.username}`;

        canvas
            .setColor(TEXT_COLOR)
            .setTextAlign("start")
            .setTextFont("40px Inter SemiBold")
            .printText(displayName, 345, 165)

            .setColor(SUBTEXT_COLOR)
            .setTextFont("30px Inter")
            .printText(username, 345, 205);
    }
}
