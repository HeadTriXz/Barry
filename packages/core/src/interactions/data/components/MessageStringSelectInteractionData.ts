import type { APIMessageStringSelectInteractionData, ComponentType } from "@discordjs/core";
import { MessageComponentInteractionData } from "./MessageComponentInteractionData.js";

/**
 * Represents the data of a message component interaction with type "STRING_SELECT".
 */
export class MessageStringSelectInteractionData extends MessageComponentInteractionData {
    /**
     * The type of component.
     */
    declare componentType: ComponentType.StringSelect;

    /**
     * An array of selected values.
     */
    values: string[];

    /**
     * Represents the data of a message component interaction with type "STRING_SELECT".
     *
     * @param data The raw data of the interaction.
     */
    constructor(data: APIMessageStringSelectInteractionData) {
        super(data);

        this.values = data.values;
    }
}
