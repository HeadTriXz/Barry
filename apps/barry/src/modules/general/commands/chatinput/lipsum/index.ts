import {
    type ApplicationCommandInteraction,
    SlashCommand,
    SlashCommandOptionBuilder
} from "@barry-bot/core";
import type GeneralModule from "../../../index.js";

import { ApplicationIntegrationType } from "@discordjs/core";
import {
    generateParagraphs,
    generateSentences,
    generateWords
} from "./generator.js";
import config from "../../../../../config.js";

/**
 * Options for the lorem ipsum slash command.
 */
interface LipsumOptions {
    /**
     * The amount of paragraphs to generate.
     */
    paragraphs?: number;

    /**
     * The amount of sentences to generate.
     */
    sentences?: number;

    /**
     * The amount of words to generate.
     */
    words?: number;
}

/**
 * Represents a slash command that generates lorem ipsum text.
 */
export default class extends SlashCommand<GeneralModule> {
    /**
     * Represents a slash command that generates lorem ipsum text.
     *
     * @param module The module the command belongs to.
     */
    constructor(module: GeneralModule) {
        super(module, {
            name: "lipsum",
            description: "Lorem ipsum dolor sit amet.",
            integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
            options: {
                words: SlashCommandOptionBuilder.integer({
                    description: "The amount of words to generate.",
                    maximum: 2000,
                    minimum: 1
                }),
                sentences: SlashCommandOptionBuilder.integer({
                    description: "The amount of sentences to generate.",
                    maximum: 100,
                    minimum: 1
                }),
                paragraphs: SlashCommandOptionBuilder.integer({
                    description: "The amount of paragraphs to generate.",
                    maximum: 15,
                    minimum: 1
                })
            }
        });
    }

    /**
     * Execute the "lipsum" command.
     *
     * @param interaction The interaction that triggered the command.
     * @param options Options for generating the lorem ipsum text.
     */
    async execute(interaction: ApplicationCommandInteraction, options: LipsumOptions): Promise<void> {
        const content = this.#getContent(options);
        if (content.length > 2000) {
            return interaction.createMessage({
                content: `${config.emotes.check} I couldn't fit everything in one message, so I sent it as a file instead:`,
                files: [{
                    data: content,
                    name: "lipsum.txt"
                }]
            });
        }

        await interaction.createMessage({ content });
    }

    /**
     * Returns the lorem ipsum text based on the provided options.
     *
     * @param options Options for generating the text.
     * @returns The lorem ipsum text.
     */
    #getContent(options: LipsumOptions): string {
        if (options.paragraphs !== undefined) {
            return generateParagraphs(options.paragraphs);
        }

        if (options.sentences !== undefined) {
            return generateSentences(options.sentences);
        }

        if (options.words !== undefined) {
            return generateWords(options.words);
        }

        return generateParagraphs(1);
    }
}
