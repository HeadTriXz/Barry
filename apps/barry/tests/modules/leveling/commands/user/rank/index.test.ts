import { Canvas, loadImage } from "canvas-constructor/napi-rs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockApplicationCommandInteraction, mockUser } from "@barry/testing";

import { ApplicationCommandInteraction } from "@barry/core";
import { createMockApplication } from "../../../../../mocks/application.js";

import LevelingModule from "../../../../../../src/modules/leveling/index.js";
import RankCommand from "../../../../../../src/modules/leveling/commands/user/rank/index.js";

vi.mock("canvas-constructor/napi-rs", async (importActual) => {
    const actual = await importActual<typeof import("canvas-constructor/napi-rs")>();

    return {
        ...actual,
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

        vi.spyOn(Canvas.prototype, "arc").mockReturnThis();
        vi.spyOn(Canvas.prototype, "beginPath").mockReturnThis();
        vi.spyOn(Canvas.prototype, "printCircle").mockReturnThis();
        vi.spyOn(Canvas.prototype, "printCircularImage").mockReturnThis();
        vi.spyOn(Canvas.prototype, "printRoundedRectangle").mockReturnThis();
        vi.spyOn(Canvas.prototype, "printText").mockReturnThis();
        vi.spyOn(Canvas.prototype, "setColor").mockReturnThis();
        vi.spyOn(Canvas.prototype, "setLineCap").mockReturnThis();
        vi.spyOn(Canvas.prototype, "setStroke").mockReturnThis();
        vi.spyOn(Canvas.prototype, "setStrokeWidth").mockReturnThis();
        vi.spyOn(Canvas.prototype, "setTextAlign").mockReturnThis();
        vi.spyOn(Canvas.prototype, "setTextFont").mockReturnThis();
        vi.spyOn(Canvas.prototype, "pngAsync")
            .mockResolvedValue(Buffer.from("Hello World"));

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
        vi.restoreAllMocks();
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
