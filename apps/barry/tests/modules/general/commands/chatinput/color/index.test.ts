import type { Canvas } from "canvas-constructor/napi-rs";

import { ApplicationCommandInteraction } from "@barry/core";
import { MessageFlags } from "@discordjs/core";
import { createMockApplication } from "../../../../../mocks/index.js";
import { createMockApplicationCommandInteraction } from "@barry/testing";

import ColorCommand from "../../../../../../src/modules/general/commands/chatinput/color/index.js";
import GeneralModule from "../../../../../../src/modules/general/index.js";

vi.mock("canvas-constructor/napi-rs", () => {
    const MockCanvas: typeof Canvas = vi.fn();
    MockCanvas.prototype.printRectangle = vi.fn().mockReturnThis();
    MockCanvas.prototype.setColor = vi.fn().mockReturnThis();
    MockCanvas.prototype.pngAsync = vi.fn().mockResolvedValue(Buffer.from("Hello World"));

    return {
        Canvas: MockCanvas,
        loadFont: vi.fn(),
        loadImage: vi.fn()
    };
});

describe("/color", () => {
    let command: ColorCommand;
    let interaction: ApplicationCommandInteraction;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new GeneralModule(client);
        command = new ColorCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client, vi.fn());
        interaction.createMessage = vi.fn();
    });

    describe("execute", () => {
        it("should send information about the color", async () => {
            await command.execute(interaction, {
                color: "#ffffff"
            });

            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                embeds: [{
                    color: expect.any(Number),
                    fields: expect.arrayContaining([{
                        inline: true,
                        name: "HEX",
                        value: "`#ffffff`"
                    }]),
                    image: {
                        url: "attachment://color.png"
                    },
                    title: "White"
                }],
                files: [{
                    data: Buffer.from("Hello World"),
                    name: "color.png"
                }]
            });
        });

        it("should send an error message if the color is invalid", async () => {
            await command.execute(interaction, {
                color: "invalid"
            });

            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                content: expect.stringContaining("That is not a valid color."),
                flags: MessageFlags.Ephemeral
            });
        });
    });
});
