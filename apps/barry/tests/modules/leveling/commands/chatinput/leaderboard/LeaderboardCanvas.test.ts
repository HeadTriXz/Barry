import { type Canvas, loadImage } from "canvas-constructor/napi-rs";
import type { MemberActivity } from "@prisma/client";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockMessage, mockUser } from "@barry/testing";

import { LeaderboardCanvas } from "../../../../../../src/modules/leveling/commands/chatinput/leaderboard/LeaderboardCanvas.js";
import { MemberActivitySortBy } from "../../../../../../src/modules/leveling/database.js";
import { createMockApplication } from "../../../../../mocks/application.js";

import LevelingModule from "../../../../../../src/modules/leveling/index.js";

vi.mock("canvas-constructor/napi-rs", () => {
    const MockCanvas: typeof Canvas = vi.fn();
    MockCanvas.prototype.measureText = vi.fn().mockReturnValue({ width: 0 } as TextMetrics);
    MockCanvas.prototype.printCircularImage = vi.fn().mockReturnThis();
    MockCanvas.prototype.printText = vi.fn().mockReturnThis();
    MockCanvas.prototype.setColor = vi.fn().mockReturnThis();
    MockCanvas.prototype.setTextAlign = vi.fn().mockReturnThis();
    MockCanvas.prototype.setTextFont = vi.fn().mockReturnThis();
    MockCanvas.prototype.setTextSize = vi.fn().mockReturnThis();

    return {
        Canvas: MockCanvas,
        loadFont: vi.fn(),
        loadImage: vi.fn()
    };
});

describe("LeaderboardCanvas", () => {
    const guildID = "68239102456844360";
    const userID = "257522665441460225";

    let canvas: LeaderboardCanvas;
    let members: MemberActivity[];

    beforeEach(() => {
        const client = createMockApplication();

        vi.spyOn(client.api.webhooks, "editMessage").mockResolvedValue(mockMessage);
        vi.spyOn(client.api.users, "get").mockResolvedValue(mockUser);

        const module = new LevelingModule(client);
        members = Array.from({ length: 25 }, () => ({
            guildID: guildID,
            userID: userID,
            experience: 1520,
            level: 5,
            messageCount: 75,
            reputation: 2,
            voiceMinutes: 0
        }));

        canvas = new LeaderboardCanvas(module, members, 1);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("printAvatar", () => {
        it("should use the avatar of the user", async () => {
            await canvas.printAvatar(mockUser, 0, 0, 0);

            expect(loadImage).toHaveBeenCalledOnce();
            expect(loadImage).toHaveBeenCalledWith(
                expect.stringContaining("https://cdn.discordapp.com/avatars")
            );
        });

        it("should use the default avatar if the user has none", async () => {
            await canvas.printAvatar({ ...mockUser, avatar: null }, 0, 0, 0);

            expect(loadImage).toHaveBeenCalledOnce();
            expect(loadImage).toHaveBeenCalledWith(
                expect.stringContaining("https://cdn.discordapp.com/embed/avatars/")
            );
        });
    });

    describe("printResponsiveText", () => {
        it("should print the input text as it is, if it fits within the given width", () => {
            vi.mocked(canvas.canvas.measureText).mockReturnValue({ width: 150 } as TextMetrics);

            canvas.printResponsiveText("Hello World", 0, 0, 30, 40, 200);

            expect(canvas.canvas.setTextSize).not.toHaveBeenCalled();
            expect(canvas.canvas.printText).toHaveBeenCalledOnce();
            expect(canvas.canvas.printText).toHaveBeenCalledWith("Hello World", 0, 0);
        });

        it("should lower the font size if it exceeds the given width", () => {
            vi.mocked(canvas.canvas.measureText)
                .mockReturnValueOnce({ width: 150 } as TextMetrics)
                .mockReturnValueOnce({ width: 140 } as TextMetrics)
                .mockReturnValueOnce({ width: 130 } as TextMetrics)
                .mockReturnValueOnce({ width: 120 } as TextMetrics)
                .mockReturnValueOnce({ width: 110 } as TextMetrics)
                .mockReturnValueOnce({ width: 100 } as TextMetrics);

            canvas.printResponsiveText("Hello World", 0, 0, 30, 40, 100);

            expect(canvas.canvas.setTextSize).toHaveBeenCalledTimes(5);
            expect(canvas.canvas.printText).toHaveBeenCalledOnce();
            expect(canvas.canvas.printText).toHaveBeenCalledWith("Hello World", 0, 0);
        });

        it("should truncate the text if it still exceeds the given width", () => {
            vi.mocked(canvas.canvas.measureText)
                .mockReturnValueOnce({ width: 150 } as TextMetrics)
                .mockReturnValueOnce({ width: 140 } as TextMetrics)
                .mockReturnValueOnce({ width: 130 } as TextMetrics)
                .mockReturnValueOnce({ width: 120 } as TextMetrics)
                .mockReturnValueOnce({ width: 110 } as TextMetrics)
                .mockReturnValueOnce({ width: 100 } as TextMetrics);

            canvas.printResponsiveText("Hello World", 0, 0, 39, 40, 100);

            expect(canvas.canvas.setTextSize).toHaveBeenCalledOnce();
            expect(canvas.canvas.printText).toHaveBeenCalledOnce();
            expect(canvas.canvas.printText).toHaveBeenCalledWith("Hello W", 0, 0);
        });
    });

    describe("printUsername", () => {
        it("should show the display name of the user", () => {
            canvas.printUsername(mockUser, 0, 0, 500);

            expect(canvas.canvas.printText).toHaveBeenCalledTimes(2);
            expect(canvas.canvas.printText).toHaveBeenCalledWith("HeadTriXz", 0, 0);
        });

        it("should show the username if the user does not have a display name", () => {
            canvas.printUsername({ ...mockUser, global_name: null }, 0, 0, 500);

            expect(canvas.canvas.printText).toHaveBeenCalledTimes(2);
            expect(canvas.canvas.printText).toHaveBeenCalledWith("headtrixz", 0, 0);
        });

        it("should show the username of the user", () => {
            canvas.printUsername(mockUser, 0, 0, 500);

            expect(canvas.canvas.printText).toHaveBeenCalledTimes(2);
            expect(canvas.canvas.printText).toHaveBeenCalledWith("@headtrixz", 0, 38);
        });

        it("should show the discriminator if the user does not use the new username system yet", () => {
            canvas.printUsername({ ...mockUser, discriminator: "0001" }, 0, 0, 500);

            expect(canvas.canvas.printText).toHaveBeenCalledTimes(2);
            expect(canvas.canvas.printText).toHaveBeenCalledWith("#0001", 0, 38);
        });
    });

    describe("getMaxRankWidth", () => {
        it("should return the width of the rank with the highest width", async () => {
            const chunk = members.slice(0, 5);
            const sortBy = MemberActivitySortBy.Experience;

            vi.mocked(canvas.canvas.measureText)
                .mockReturnValueOnce({ width: 20 } as TextMetrics)
                .mockReturnValue({ width: 25 } as TextMetrics);

            const avatarSpy = vi.spyOn(canvas, "printAvatar");

            await canvas.printUsers(chunk, sortBy);

            expect(avatarSpy).toHaveBeenCalledTimes(5);
            expect(avatarSpy).toHaveBeenCalledWith(mockUser, 185, 941, 61);
        });
    });
});
