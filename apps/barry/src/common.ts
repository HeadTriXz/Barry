import type { APIInteractionResponseCallbackData } from "@discordjs/core";
import config from "./config.js";

/**
 * The content for a timeout message.
 */
export const timeoutContent: APIInteractionResponseCallbackData = {
    components: [],
    content: `${config.emotes.error} It took you too long to respond. Please try again.`,
    embeds: []
};
