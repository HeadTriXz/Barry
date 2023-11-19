import {
    type ApplicationCommandInteraction,
    SlashCommand,
    SlashCommandOptionBuilder
} from "@barry/core";
import type GeneralModule from "../../../index.js";

import { Canvas } from "canvas-constructor/napi-rs";
import { MessageFlags } from "@discordjs/core";
import { parseColor } from "../../../functions/colors.js";
import config from "../../../../../config.js";

/**
 * The options for the color command.
 */
export interface ColorOptions {
    /**
     * The color to show information about.
     */
    color: string;
}

/**
 * Represents a slash command to show information about a color.
 */
export default class extends SlashCommand<GeneralModule> {
    /**
     * Represents a slash command to show information about a color.
     *
     * @param module The module this command belongs to.
     */
    constructor(module: GeneralModule) {
        super(module, {
            name: "color",
            description: "Shows information about a color.",
            options: {
                color: SlashCommandOptionBuilder.string({
                    description: "The color to show information about.",
                    required: true
                })
            }
        });
    }

    /**
     * Shows information about a color.
     *
     * @param interaction The interaction that triggered this command.
     * @param options The options for this command.
     */
    async execute(interaction: ApplicationCommandInteraction, options: ColorOptions): Promise<void> {
        const color = parseColor(options.color);
        if (color === undefined) {
            return interaction.createMessage({
                content: `${config.emotes.error} That is not a valid color.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const canvas = new Canvas(1000, 300)
            .setColor(`#${color.hex}`)
            .printRectangle(0, 0, 1000, 300);

        const buffer = await canvas.pngAsync();
        return interaction.createMessage({
            embeds: [{
                color: config.embedColor,
                fields: [
                    { inline: true, name: "HEX", value: `\`#${color.hex}\`` },
                    { inline: true, name: "RGB", value: `\`rgb(${color.rgb.join(", ")})\`` },
                    { inline: true, name: "CMYK", value: `\`cmyk(${color.cmyk.join(", ")})\`` },
                    { inline: true, name: "HSL", value: `\`hsl(${color.hsl.join(", ")})\`` },
                    { inline: true, name: "HSV", value: `\`hsv(${color.hsv.join(", ")})\`` },
                    { inline: true, name: "LAB", value: `\`lab(${color.lab.join(", ")})\`` }
                ],
                image: {
                    url: "attachment://color.png"
                },
                title: color.name[0].toUpperCase() + color.name.slice(1)
            }],
            files: [{
                data: buffer,
                name: "color.png"
            }]
        });
    }
}
