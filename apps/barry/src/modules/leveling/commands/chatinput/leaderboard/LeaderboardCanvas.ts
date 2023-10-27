import type { APIUser } from "@discordjs/core";
import type { MemberActivity } from "@prisma/client";
import type LevelingModule from "../../../index.js";

import {
    ACCENT_COLOR,
    BACKGROUND_COLOR,
    DIVIDER_COLOR,
    PAGE_SIZE,
    SECONDARY_COLOR,
    SUBTEXT_COLOR,
    TEXT_COLOR
} from "./constants.js";
import { Canvas, loadImage } from "canvas-constructor/napi-rs";
import { LeaderboardPodium } from "./LeaderboardPodium.js";
import { MemberActivitySortBy } from "../../../database/index.js";
import { getAvatarURL } from "@barry/core";

/**
 * Represents the dimensions of a piece of text in a canvas.
 */
export interface TextMetrics {
    /**
     * The width of a segment of inline text in CSS pixels.
     */
    width: number;
}

/**
 * Represents the canvas used to generate the leaderboard image.
 */
export class LeaderboardCanvas {
    /**
     * The canvas instance used for generating the leaderboard.
     */
    canvas: Canvas;

    /**
     * The LevelingModule instance.
     */
    module: LevelingModule;

    /**
     * The array of member activities.
     */
    #members: MemberActivity[];

    /**
     * The current page number.
     */
    #page: number;

    /**
     * Represents the canvas used to generate the leaderboard image.
     *
     * @param module The LevelingModule instance.
     * @param members The array of member activities.
     * @param page The current page number.
     */
    constructor(module: LevelingModule, members: MemberActivity[], page: number) {
        this.module = module;
        this.#members = members;
        this.#page = page;

        const baseHeight = page === 1 ? 850 : 246;
        const height = baseHeight + this.pageSize * 194;

        this.canvas = new Canvas(1000, height);
    }

    /**
     * Gets the number of members to display per page.
     */
    get pageSize(): number {
        return this.#page === 1
            ? this.#members.length - 3
            : this.#members.length;
    }

    /**
     * Checks if the leaderboard has a podium (top three members).
     */
    get withPodium(): boolean {
        return this.#page === 1 && this.#members.length > 3;
    }

    /**
     * Generates the leaderboard image.
     *
     * @param sortBy The field by which to sort the leaderboard.
     * @returns The leaderboard image buffer.
     */
    async generate(sortBy: MemberActivitySortBy): Promise<Buffer> {
        this.printBase();
        this.printSelected(sortBy);
        this.printDividers();

        const members = [ ...this.#members ];

        if (this.withPodium) {
            const podium = new LeaderboardPodium(this);
            const podiumUsers = members.splice(0, 3);

            await podium.generate(podiumUsers, sortBy);
        }

        await this.printUsers(members, sortBy);

        return this.canvas.pngAsync();
    }

    /**
     * Prints the avatar of a user on the canvas.
     *
     * @param user The user to print the avatar of.
     * @param x The x-coordinate of the avatar.
     * @param y The y-coordinate of the avatar.
     * @param radius The radius of the avatar.
     */
    async printAvatar(user: APIUser, x: number, y: number, radius: number): Promise<void> {
        const avatarURL = getAvatarURL(user, {
            extension: "png",
            forceStatic: true,
            size: 256
        });

        const avatar = await loadImage(avatarURL);

        this.canvas.printCircularImage(avatar, x, y, radius);
    }

    /**
     * Prints the base elements of the leaderboard canvas.
     */
    printBase(): void {
        const offset = this.withPodium ? 838 : 234;

        this.canvas
            .setColor(BACKGROUND_COLOR)
            .printRoundedRectangle(0, 0, 1000, this.canvas.height, 90)

            .setColor(SECONDARY_COLOR)
            .printRoundedRectangle(0, offset, 1000, this.canvas.height - offset, 90)
            .printRoundedRectangle(60, 60, 880, 114, 40)

            .setColor(DIVIDER_COLOR)
            .printRoundedRectangle(498, 74, 4, 86, 2);
    }

    /**
     * Prints the dividers on the leaderboard canvas.
     */
    printDividers(): void {
        const offset = this.withPodium ? 842 : 244;

        this.canvas.setColor(DIVIDER_COLOR);

        for (let i = 1; i < this.pageSize; i++) {
            this.canvas.printRoundedRectangle(60, offset + 194 * i, 880, 4, 2);
        }
    }

    /**
     * Prints text responsively based on the available space.
     *
     * @param text The text to print.
     * @param x The x-coordinate to start printing the text.
     * @param y The y-coordinate to start printing the text.
     * @param minFontSize The minimum font size.
     * @param maxFontSize The maximum font size.
     * @param maxWidth The maximum width for the text.
     */
    printResponsiveText(
        text: string,
        x: number,
        y: number,
        minFontSize: number,
        maxFontSize: number,
        maxWidth: number
    ): void {
        let fontSize = maxFontSize;

        while ((this.canvas.measureText(text) as TextMetrics).width > maxWidth) {
            if (fontSize > minFontSize) {
                this.canvas.setTextSize(--fontSize);
            } else {
                text = text.slice(0, -1);
            }
        }

        this.canvas.printText(text, x, y);
    }

    /**
     * Prints the score of a member on the leaderboard canvas.
     *
     * @param score The score of the member.
     * @param y The y-coordinate to print the score.
     */
    printScore(score: number, y: number): void {
        const formatted = this.module.formatNumber(score);

        this.canvas
            .setColor(TEXT_COLOR)
            .setTextFont("40px Inter SemiBold")
            .setTextAlign("end")
            .printText(formatted, 940, y);
    }

    /**
     * Prints the selected sorting option on the leaderboard canvas.
     *
     * @param sortBy The field by which to sort the leaderboard.
     */
    printSelected(sortBy: MemberActivitySortBy): void {
        this.canvas
            .setColor(TEXT_COLOR)
            .setTextFont("40px Inter SemiBold")
            .printText("Experience", 179, 133)
            .printText("Reputation", 622, 133)

            .setColor(ACCENT_COLOR);

        if (sortBy === MemberActivitySortBy.Experience) {
            this.canvas.printRoundedRectangle(205, 167, 150, 7, 4);
        }

        if (sortBy === MemberActivitySortBy.Reputation) {
            this.canvas.printRoundedRectangle(645, 167, 150, 7, 4);
        }
    }

    /**
     * Prints the username and discriminator of a user on the leaderboard canvas.
     *
     * @param user The user to print the username of.
     * @param x The x-coordinate to start printing the username.
     * @param y The y-coordinate to start printing the username.
     * @param maxWidth The maximum width for the text.
     */
    printUsername(user: APIUser, x: number, y: number, maxWidth: number): void {
        const displayName = user.global_name ?? user.username;
        const username = user.discriminator !== "0"
            ? `#${user.discriminator}`
            : `@${user.username}`;

        // Display name
        this.canvas
            .setColor(TEXT_COLOR)
            .setTextFont("40px Inter SemiBold");

        this.printResponsiveText(displayName, x, y, 32, 40, maxWidth);

        // Username
        this.canvas
            .setColor(SUBTEXT_COLOR)
            .setTextFont("30px Inter");

        this.printResponsiveText(username, x, y + 38, 22, 30, maxWidth);
    }

    /**
     * Prints the information of all members on the leaderboard.
     *
     * @param members The members to display on the leaderboard.
     * @param sortBy The field by which to sort the leaderboard.
     */
    async printUsers(members: MemberActivity[], sortBy: MemberActivitySortBy): Promise<void> {
        const offset = this.withPodium ? 941 : 343;
        const indexStart = this.withPodium ? 4 : 1;
        const indexOffset = (this.#page - 1) * PAGE_SIZE + indexStart;

        for (let i = 0; i < members.length; i++) {
            const user = await this.module.client.api.users.get(members[i].userID);
            const center = offset + 194 * i;

            this.canvas
                .setColor(SUBTEXT_COLOR)
                .setTextFont("36px Inter SemiBold")
                .setTextAlign("start")
                .printText(`${i + indexOffset}`, 60, center + 13);

            const width = this.#getMaxRankWidth(this.#page);

            await this.printAvatar(user, 160 + width, center, 61);
            this.printUsername(user, 260 + width, center - 8, 450);
            this.printScore(members[i][sortBy], center + 15);
        }
    }

    /**
     * Gets the width of the rank with the highest width.
     *
     * @param page The current page number.
     * @returns The maximum width.
     */
    #getMaxRankWidth(page: number): number {
        const offset = (page - 1) * PAGE_SIZE;

        this.canvas.setTextFont("36px Inter SemiBold");

        let maxWidth = 0;
        for (let i = 0; i < PAGE_SIZE; i++) {
            const { width } = this.canvas.measureText(`${i + offset}`) as TextMetrics;
            if (width > maxWidth) {
                maxWidth = width;
            }
        }

        return maxWidth;
    }
}
