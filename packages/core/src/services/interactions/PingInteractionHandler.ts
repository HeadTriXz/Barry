import type { InteractionHandler } from "./InteractionService.js";
import type { PingInteraction } from "../../index.js";

/**
 * Represents a handler that processes incoming ping interactions.
 */
export class PingInteractionHandler implements InteractionHandler {
    /**
     * Handles the incoming interaction.
     *
     * @param interaction The interaction to handle.
     */
    async handle(interaction: PingInteraction): Promise<void> {
        return interaction.pong();
    }
}
