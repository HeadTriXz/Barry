import type { MemberActivity } from "@prisma/client";
import type { MemberActivitySortBy } from "../../../database.js";
import type { LeaderboardCanvas } from "./LeaderboardCanvas.js";
import {
    BACKGROUND_COLOR,
    DIVIDER_COLOR,
    FIRST_PLACE_COLOR,
    SECOND_PLACE_COLOR,
    SECONDARY_COLOR,
    TEXT_COLOR,
    THIRD_PLACE_COLOR
} from "./constants.js";

/**
 * Represents the leaderboard podium that displays the top three members.
 */
export class LeaderboardPodium {
    /**
     * The canvas used to generate the leaderboard image.
     */
    #leaderboard: LeaderboardCanvas;

    /**
     * Represents the leaderboard podium that displays the top three members.
     *
     * @param leaderboard The canvas used to generate the leaderboard image.
     */
    constructor(leaderboard: LeaderboardCanvas) {
        this.#leaderboard = leaderboard;
    }

    /**
     * Generates the leaderboard podium.
     *
     * @param members The array of member activities.
     * @param sortBy The field by which to sort the leaderboard.
     */
    async generate(members: MemberActivity[], sortBy: MemberActivitySortBy): Promise<void> {
        this.#printBase();

        await this.#printUsers(members, sortBy);

        this.#printRanks();
    }

    /**
     * Prints the base elements of the leaderboard podium.
     */
    #printBase(): void {
        this.#leaderboard.canvas
            .setColor(SECONDARY_COLOR)
            .printRoundedRectangle(60, 521, 880, 257, 40)

            .setColor(DIVIDER_COLOR)
            .printRoundedRectangle(353, 408, 294, 370, {
                bl: 0,
                br: 0,
                tl: 90,
                tr: 90
            })

            .setColor(FIRST_PLACE_COLOR)
            .printCircle(500, 340, 105)

            .setColor(SECOND_PLACE_COLOR)
            .printCircle(205, 455, 105)

            .setColor(THIRD_PLACE_COLOR)
            .printCircle(795, 455, 105);
    }

    /**
     * Prints the ranks (#1, #2, #3) on the leaderboard podium.
     */
    #printRanks(): void {
        this.#leaderboard.canvas
            // #1
            .save()
            .setColor(FIRST_PLACE_COLOR)
            .setTransform(1, 0, 0, 1, 500, 440)
            .rotate(Math.PI / 4)
            .printRoundedRectangle(-31, -31, 62, 62, 20)
            .restore()

            // #2
            .save()
            .setColor(SECOND_PLACE_COLOR)
            .setTransform(1, 0, 0, 1, 205, 555)
            .rotate(Math.PI / 4)
            .printRoundedRectangle(-31, -31, 62, 62, 20)
            .restore()

            // #3
            .save()
            .setColor(THIRD_PLACE_COLOR)
            .setTransform(1, 0, 0, 1, 795, 555)
            .rotate(Math.PI / 4)
            .printRoundedRectangle(-31, -31, 62, 62, 20)
            .restore()

            // Text
            .setColor(BACKGROUND_COLOR)
            .setTextFont("43px Inter SemiBold")
            .setTextAlign("center")
            .printText("1", 500, 457)
            .printText("2", 205, 572)
            .printText("3", 795, 572);
    }

    /**
     * Prints the score of a member on the leaderboard podium.
     *
     * @param score The score of the member.
     * @param x The x-coordinate of the score.
     */
    #printScore(score: number, x: number): void {
        const formatted = this.#leaderboard.module.formatNumber(score);

        this.#leaderboard.canvas
            .setColor(TEXT_COLOR)
            .setTextFont("40px Inter SemiBold")
            .setTextAlign("center")
            .printText(formatted, x, 743);
    }

    /**
     * Prints the information of the top three members on the leaderboard podium.
     *
     * @param members The members to display on the podium.
     * @param sortBy The field by which to sort the leaderboard.
     */
    async #printUsers(members: MemberActivity[], sortBy: MemberActivitySortBy): Promise<void> {
        this.#leaderboard.canvas.setTextAlign("center");

        if (members[0] !== undefined) {
            this.#printScore(members[0][sortBy], 500);

            const user = await this.#leaderboard.module.client.api.users.get(members[0].userID);

            await this.#leaderboard.printAvatar(user, 500, 340, 97);
            this.#leaderboard.printUsername(user, 500, 565, 240);
        }

        if (members[1] !== undefined) {
            this.#printScore(members[1][sortBy], 205);

            const user = await this.#leaderboard.module.client.api.users.get(members[1].userID);

            await this.#leaderboard.printAvatar(user, 205, 455, 97);
            this.#leaderboard.printUsername(user, 205, 640, 240);
        }

        if (members[2] !== undefined) {
            this.#printScore(members[2][sortBy], 795);

            const user = await this.#leaderboard.module.client.api.users.get(members[2].userID);

            await this.#leaderboard.printAvatar(user, 795, 455, 97);
            this.#leaderboard.printUsername(user, 795, 640, 240);
        }
    }
}
