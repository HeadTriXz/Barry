import {
    type ApplicationCommandInteraction,
    SlashCommand,
    SlashCommandOptionBuilder
} from "@barry/core";
import { type APIAttachment, MessageFlags } from "@discordjs/core";
import type GeneralModule from "../../../../index.js";

import { getReverseContent } from "../../../../functions/reverse/getReverseContent.js";
import config from "../../../../../../config.js";

/**
 * Represents a slash command for reverse searching an image.
 */
export default class extends SlashCommand<GeneralModule> {
    /**
     * Represents a slash command for reverse searching an image.
     *
     * @param module The module this command belongs to.
     */
    constructor(module: GeneralModule) {
        super(module, {
            name: "image",
            description: "Reverse search an image.",
            options: {
                image: SlashCommandOptionBuilder.attachments({
                    description: "The image to reverse search.",
                    required: true
                })
            }
        });
    }

    /**
     * Executes the "/reverse image" command.
     *
     * @param interaction The interaction that triggered the command.
     * @param options The provided image to reverse search.
     */
    async execute(interaction: ApplicationCommandInteraction, options: { image: APIAttachment }): Promise<void> {
        if (!options.image.content_type?.startsWith("image")) {
            return interaction.createMessage({
                content: `${config.emotes.error} That is not a valid image.`,
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.createMessage(getReverseContent([options.image]));
    }
}
