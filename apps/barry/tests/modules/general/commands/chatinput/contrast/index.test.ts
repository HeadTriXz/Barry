import type { Canvas } from "canvas-constructor/napi-rs";

import { ApplicationCommandInteraction } from "@barry-bot/core";
import { MessageFlags } from "@discordjs/core";
import { createMockApplication } from "../../../../../mocks/index.js";
import { createMockApplicationCommandInteraction } from "@barry-bot/testing";

import ContrastCommand from "../../../../../../src/modules/general/commands/chatinput/contrast/index.js";
import GeneralModule from "../../../../../../src/modules/general/index.js";

vi.mock("canvas-constructor/napi-rs", () => {
    const MockCanvas: typeof Canvas = vi.fn();
    MockCanvas.prototype.printRoundedRectangle = vi.fn().mockReturnThis();
    MockCanvas.prototype.printWrappedText = vi.fn().mockReturnThis();
    MockCanvas.prototype.printText = vi.fn().mockReturnThis();
    MockCanvas.prototype.setColor = vi.fn().mockReturnThis();
    MockCanvas.prototype.setTextAlign = vi.fn().mockReturnThis();
    MockCanvas.prototype.setTextFont = vi.fn().mockReturnThis();
    MockCanvas.prototype.pngAsync = vi.fn().mockResolvedValue(Buffer.from("Hello World"));

    return {
        Canvas: MockCanvas,
        loadFont: vi.fn(),
        loadImage: vi.fn()
    };
});

describe("/contrast", () => {
    let command: ContrastCommand;
    let interaction: ApplicationCommandInteraction;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new GeneralModule(client);
        command = new ContrastCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client, vi.fn());
        interaction.createMessage = vi.fn();
    });

    describe("execute", () => {
        it("should send the result of the contrast check", async () => {
            await command.execute(interaction, {
                background: "#000000",
                foreground: "#ffffff"
            });

            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                embeds: [{
                    color: expect.any(Number),
                    description: expect.stringContaining("**Contrast:** `21.00`"),
                    image: {
                        url: "attachment://contrast.png"
                    }
                }],
                files: [{
                    data: Buffer.from("Hello World"),
                    name: "contrast.png"
                }]
            });
        });

        it("should send an error message if the background color is invalid", async () => {
            await command.execute(interaction, {
                background: "invalid",
                foreground: "#ffffff"
            });

            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                content: expect.stringContaining("That is not a valid background color."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should send an error message if the foreground color is invalid", async () => {
            await command.execute(interaction, {
                background: "#000000",
                foreground: "invalid"
            });

            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                content: expect.stringContaining("That is not a valid foreground color."),
                flags: MessageFlags.Ephemeral
            });
        });
    });

    describe("getFeedback", () => {
        it("should return great feedback if the score is greater than 7", () => {
            const feedback = command.getFeedback(7);

            expect(feedback).toContain("Great choice!");
        });

        it("should return good feedback if the score is greater than 4.5", () => {
            const feedback = command.getFeedback(4.5);

            expect(feedback).toContain("Well done!");
        });

        it("should return okay feedback if the score is less than 4.5", () => {
            const feedback = command.getFeedback(4);

            expect(feedback).toContain("Not bad.");
        });

        it("should return bad feedback if the score is less than 3", () => {
            const feedback = command.getFeedback(2);

            expect(feedback).toContain("Uh-oh.");
        });
    });
});
