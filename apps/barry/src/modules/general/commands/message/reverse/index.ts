import {
    type ApplicationCommandInteraction,
    type MessageCommandTarget,
    MessageCommand
} from "@barry/core";

import type GeneralModule from "../../../index.js";

import { MessageFlags } from "@discordjs/core";
import { createPaginatedMessage } from "../../../../../utils/pagination.js";
import { getReverseContent } from "../../../functions/reverse/getReverseContent.js";

import config from "../../../../../config.js";

/**
 * Represents a slash command for reverse searching an image.
 */
export default class extends MessageCommand<GeneralModule> {
    /**
     * Represents a slash command for reverse searching an image.
     *
     * @param module The module this command belongs to.
     */
    constructor(module: GeneralModule) {
        super(module, {
            name: "Reverse Search Image"
        });
    }

    /**
     * Executes the "Reverse Search Image" command.
     *
     * @param interaction The interaction that triggered the command.
     * @param target The resolved data provided with the command.
     */
    async execute(interaction: ApplicationCommandInteraction, { message }: MessageCommandTarget): Promise<void> {
        const attachments = message.attachments.filter((a) => a.content_type?.startsWith("image"));
        if (attachments.length === 0) {
            return interaction.createMessage({
                content: `${config.emotes.error} Could not find any images in this message.`,
                flags: MessageFlags.Ephemeral
            });
        }

        await createPaginatedMessage({
            buttons: {
                next: {
                    label: "Next Image"
                },
                previous: {
                    label: "Previous Image"
                }
            },
            content: (_, index) => getReverseContent(attachments, index),
            flags: MessageFlags.Ephemeral,
            interaction: interaction,
            pageSize: 1,
            values: attachments
        });
    }
}
