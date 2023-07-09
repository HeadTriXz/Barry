import { type InteractionType, InteractionResponseType } from "@discordjs/core";
import { Interaction } from "./Interaction.js";

/**
 * Represents a ping interaction.
 */
export class PingInteraction extends Interaction {
    /**
     * The type of interaction.
     */
    declare type: InteractionType.Ping;

    /**
     * Acknowledge the ping.
     */
    async pong(): Promise<void> {
        if (this.acknowledged) {
            throw new Error("You have already acknowledged this interaction.");
        }

        await this.createResponse({
            body: { type: InteractionResponseType.Pong }
        });

        this.acknowledged = true;
    }
}
