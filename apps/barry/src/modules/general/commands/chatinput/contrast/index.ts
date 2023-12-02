import {
    type ApplicationCommandInteraction,
    SlashCommand,
    SlashCommandOptionBuilder
} from "@barry-bot/core";
import type GeneralModule from "../../../index.js";

import { Canvas, loadFont } from "canvas-constructor/napi-rs";
import { getContrastScore, parseColor } from "../../../functions/colors.js";
import { MessageFlags } from "@discordjs/core";
import { join } from "node:path";
import config from "../../../../../config.js";

loadFont(join(process.cwd(), "./assets/fonts/Inter-SemiBold.ttf"), "Inter SemiBold");
loadFont(join(process.cwd(), "./assets/fonts/Inter-Regular.ttf"), "Inter");

/**
 * The placeholder text to use for the image.
 */
const PLACEHOLDER_TEXT = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";

/**
 * The placeholder title to use for the image.
 */
const PLACEHOLDER_TITLE = "Lorem Ipsum";

/**
 * The options for the contrast command.
 */
export interface ContrastOptions {
    /**
     * The background color.
     */
    background: string;

    /**
     * The foreground color.
     */
    foreground: string;
}

/**
 * Represents a slash command to check the contrast between two colors.
 */
export default class extends SlashCommand<GeneralModule> {
    /**
     * Represents a slash command to check the contrast between two colors.
     *
     * @param module The module this command belongs to.
     */
    constructor(module: GeneralModule) {
        super(module, {
            name: "contrast",
            description: "Check the contrast between two colors.",
            options: {
                background: SlashCommandOptionBuilder.string({
                    description: "The background color.",
                    required: true
                }),
                foreground: SlashCommandOptionBuilder.string({
                    description: "The foreground color.",
                    required: true
                })
            }
        });
    }

    /**
     * Checks the contrast between two colors.
     *
     * @param interaction The interaction that triggered this command.
     * @param options The options for this command.
     */
    async execute(interaction: ApplicationCommandInteraction, options: ContrastOptions): Promise<void> {
        const background = parseColor(options.background);
        if (background === undefined) {
            return interaction.createMessage({
                content: `${config.emotes.error} That is not a valid background color.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const foreground = parseColor(options.foreground);
        if (foreground === undefined) {
            return interaction.createMessage({
                content: `${config.emotes.error} That is not a valid foreground color.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const score = getContrastScore(background, foreground);
        const feedback = this.getFeedback(score);

        const canvas = new Canvas(1000, 300)
            .setTextAlign("center")

            // Background
            .setColor(`#${background.hex}`)
            .printRoundedRectangle(0, 0, 495, 300, 30)

            // Foreground
            .setColor(`#${foreground.hex}`)
            .printRoundedRectangle(505, 0, 495, 300, 30)

            // Background Text
            .setColor(`#${foreground.hex}`)
            .setTextFont("30px Inter SemiBold")
            .printText(PLACEHOLDER_TITLE, 250, 120)
            .setTextFont("20px Inter")
            .printWrappedText(PLACEHOLDER_TEXT, 250, 150, 400)

            // Foreground Text
            .setColor(`#${background.hex}`)
            .setTextFont("30px Inter SemiBold")
            .printText(PLACEHOLDER_TITLE, 750, 120)
            .setTextFont("20px Inter")
            .printWrappedText(PLACEHOLDER_TEXT, 750, 150, 400);

        const buffer = await canvas.pngAsync();
        return interaction.createMessage({
            embeds: [{
                color: config.embedColor,
                description: `**Contrast:** \`${score.toFixed(2)}\`\n\n${feedback}`,
                image: {
                    url: "attachment://contrast.png"
                }
            }],
            files: [{
                data: buffer,
                name: "contrast.png"
            }]
        });
    }

    /**
     * Gets the feedback for a contrast score.
     *
     * @param contrast The contrast score.
     * @returns The feedback for the contrast score.
     */
    getFeedback(contrast: number): string {
        if (contrast >= 7) {
            return "Great choice! This color combination provides excellent contrast, making it accessible for both small and large text (AAA).";
        }

        if (contrast >= 4.5) {
            return "Well done! This color combination offers good contrast, meeting accessibility standards for small text (AA) and exceeding them for large text (AAA).";
        }

        if (contrast >= 3) {
            return "Not bad. This color combination has acceptable contrast for large text (AA), but falls short for small text. Consider adjusting for better accessibility.";
        }

        return "Uh-oh. This color combination has poor contrast, making it inaccessible for both small and large text. Please choose colors with better differentiation.";
    }
}
