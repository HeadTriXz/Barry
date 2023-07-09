import type { ComponentType } from "@discordjs/core";
import { MessageComponentInteractionData } from "./MessageComponentInteractionData.js";

/**
 * Represents the data of a message component interaction with type "BUTTON".
 */
export class MessageButtonInteractionData extends MessageComponentInteractionData {
    /**
     * The type of component.
     */
    declare componentType: ComponentType.Button;
}
