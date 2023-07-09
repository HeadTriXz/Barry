import { type APIInteractionResponseCallbackData, InteractionResponseType } from "@discordjs/core";

import type { RawFile } from "@discordjs/rest";
import { ReplyableInteraction } from "./ReplyableInteraction.js";

/**
 * Represents options for interaction response data with files.
 */
interface APIInteractionResponseCallbackDataWithFiles extends APIInteractionResponseCallbackData {
    /**
     * Files to attach to the response.
     */
    files?: RawFile[];
}

/**
 * Represents an interaction.
 */
export class UpdatableInteraction extends ReplyableInteraction {
    /**
     * Acknowledges the interaction with a defer message update response.
     */
    async deferUpdate(): Promise<void> {
        if (this.acknowledged) {
            throw new Error("You have already acknowledged this interaction.");
        }

        await this.createResponse({
            body: { type: InteractionResponseType.DeferredMessageUpdate }
        });

        this.acknowledged = true;
    }

    /**
     * Acknowledges the interaction by editing the parent message. If already acknowledged, runs editOriginalMessage.
     *
     * @param options The options for the message.
     */
    async editParent({ files, ...options }: APIInteractionResponseCallbackDataWithFiles): Promise<void> {
        if (this.acknowledged) {
            await this.editOriginalMessage({ files, ...options });
            return;
        }

        await this.createResponse({
            body: {
                type: InteractionResponseType.UpdateMessage,
                data: options
            },
            files: files
        });

        this.acknowledged = true;
    }
}
