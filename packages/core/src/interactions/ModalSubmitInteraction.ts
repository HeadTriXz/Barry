import type {
    APIModalSubmitInteraction,
    InteractionType,
    ModalSubmitActionRowComponent
} from "@discordjs/core";

import type { Client } from "../Client.js";
import type { ResponseHandler } from "../Server.js";

import { UpdatableInteraction } from "./UpdatableInteraction.js";

/**
 * The data of an {@link ModalSubmitInteraction}.
 */
export interface ModalSubmitInteractionData {
    /**
     * An array of submitted components and their values.
     */
    components: ModalSubmitActionRowComponent[];

    /**
     * The ID of the modal.
     */
    customID: string;
}

/**
 * Represents a modal submit interaction.
 */
export class ModalSubmitInteraction extends UpdatableInteraction {
    /**
     * The data of the interaction.
     */
    data: ModalSubmitInteractionData;

    /**
     * The type of interaction.
     */
    declare type: InteractionType.ModalSubmit;

    /**
     * Represents a modal submit interaction.
     *
     * @param data The raw interaction object.
     * @param client The client that received the interaction.
     * @param respond The response handler to use for this interaction.
     */
    constructor(data: APIModalSubmitInteraction, client: Client, respond?: ResponseHandler) {
        super(data, client, respond);

        this.data = {
            components: data.data.components,
            customID: data.data.custom_id
        };
    }
}
