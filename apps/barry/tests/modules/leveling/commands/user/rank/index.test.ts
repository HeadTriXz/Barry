import { Canvas, loadImage } from "canvas-constructor/napi-rs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockApplicationCommandInteraction, mockUser } from "@barry/testing";

import { ApplicationCommandInteraction } from "@barry/core";
import { createMockApplication } from "../../../../../mocks/application.js";

import LevelingModule from "../../../../../../src/modules/leveling/index.js";
import RankCommand from "../../../../../../src/modules/leveling/commands/user/rank/index.js";

vi.mock("canvas-constructor/napi-rs", () => {
    const MockCanvas: typeof Canvas = vi.fn();
    MockCanvas.prototype.arc = vi.fn().mockReturnThis();
    MockCanvas.prototype.beginPath = vi.fn().mockReturnThis();
    MockCanvas.prototype.printCircle = vi.fn().mockReturnThis();
    MockCanvas.prototype.printCircularImage = vi.fn().mockReturnThis();
    MockCanvas.prototype.printRoundedRectangle = vi.fn().mockReturnThis();
    MockCanvas.prototype.printText = vi.fn().mockReturnThis();
    MockCanvas.prototype.setColor = vi.fn().mockReturnThis();
    MockCanvas.prototype.setLineCap = vi.fn().mockReturnThis();
    MockCanvas.prototype.setStroke = vi.fn().mockReturnThis();
    MockCanvas.prototype.setStrokeWidth = vi.fn().mockReturnThis();
    MockCanvas.prototype.setTextAlign = vi.fn().mockReturnThis();
    MockCanvas.prototype.setTextFont = vi.fn().mockReturnThis();
    MockCanvas.prototype.stroke = vi.fn().mockReturnThis();
    MockCanvas.prototype.pngAsync = vi.fn().mockResolvedValue(Buffer.from("Hello World"));

    return {
        Canvas: MockCanvas,
        loadFont: vi.fn(),
        loadImage: vi.fn()
    };
});

describe("View Rank", () => {
    const guildID = "68239102456844360";
    const userID = "257522665441460225";

    let command: RankCommand;
    let interaction: ApplicationCommandInteraction;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new LevelingModule(client);
        command = new RankCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client);
        interaction.defer = vi.fn();
        interaction.editOriginalMessage = vi.fn();

        vi.mocked(client.prisma.memberActivity.findUnique).mockResolvedValue({
            guildID: guildID,
            userID: userID,
            experience: 1520,
            level: 5,
            messageCount: 75,
            reputation: 2,
            voiceMinutes: 0
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("execute", () => {
        it("should send the rank card of the user", async () => {
            await command.execute(interaction, {
                user: mockUser
            });

            expect(interaction.editOriginalMessage).toHaveBeenCalledOnce();
            expect(interaction.editOriginalMessage).toHaveBeenCalledWith({
                files: [{
                    data: Buffer.from("Hello World"),
                    name: "rank.png"
                }]
            });
        });

        it("should ignore if the command was invoked outside a guild", async () => {
            interaction.guildID = undefined;

            await command.execute(interaction, {
                user: mockUser
            });

            expect(interaction.editOriginalMessage).not.toHaveBeenCalled();
        });

        it("should use the default avatar if the user has none", async () => {
            await command.execute(interaction, {
                user: { ...mockUser, avatar: null }
            });

            expect(loadImage).toHaveBeenCalledOnce();
            expect(loadImage).toHaveBeenCalledWith(
                expect.stringContaining("https://cdn.discordapp.com/embed/avatars/")
            );

            expect(interaction.editOriginalMessage).toHaveBeenCalledOnce();
            expect(interaction.editOriginalMessage).toHaveBeenCalledWith({
                files: [{
                    data: Buffer.from("Hello World"),
                    name: "rank.png"
                }]
            });
        });

        it("should show the discriminator if the user does not use the new username system yet", async () => {
            await command.execute(interaction, {
                user: { ...mockUser, discriminator: "0001" }
            });

            expect(Canvas.prototype.printText).toHaveBeenCalledWith("#0001", expect.any(Number), expect.any(Number));
            expect(Canvas.prototype.printText).not.toHaveBeenCalledWith("@headtrixz", expect.any(Number), expect.any(Number));

            expect(interaction.editOriginalMessage).toHaveBeenCalledOnce();
            expect(interaction.editOriginalMessage).toHaveBeenCalledWith({
                files: [{
                    data: Buffer.from("Hello World"),
                    name: "rank.png"
                }]
            });
        });

        it("should show the username if the user does not have a display name", async () => {
            await command.execute(interaction, {
                user: { ...mockUser, global_name: null }
            });

            expect(Canvas.prototype.printText).toHaveBeenCalledWith("headtrixz", expect.any(Number), expect.any(Number));
            expect(interaction.editOriginalMessage).toHaveBeenCalledOnce();
            expect(interaction.editOriginalMessage).toHaveBeenCalledWith({
                files: [{
                    data: Buffer.from("Hello World"),
                    name: "rank.png"
                }]
            });
        });
    });
});
