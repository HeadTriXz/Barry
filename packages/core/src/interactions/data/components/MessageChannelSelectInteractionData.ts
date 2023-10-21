import type { APIMessageChannelSelectInteractionData, ComponentType } from "@discordjs/core";
import type { InteractionResolvedData } from "../../Interaction.js";

import { MessageComponentInteractionData } from "./MessageComponentInteractionData.js";

/**
 * Represents the data of a message component interaction with type "CHANNEL_SELECT".
 */
export class MessageChannelSelectInteractionData extends MessageComponentInteractionData {
    /**
     * The type of component.
     */
    declare componentType: ComponentType.ChannelSelect;

    /**
     * Resolved data for the channel select menu.
     */
    resolved: Pick<InteractionResolvedData, "channels">;

    /**
     * The IDs of the selected channels.
     */
    values: string[];

    /**
     * Represents the data of a message component interaction with type "CHANNEL_SELECT".
     *
     * @param data The raw data of the interaction.
     */
    constructor(data: APIMessageChannelSelectInteractionData) {
        super(data);

        this.resolved = {
            channels: new Map()
        };

        if (data.resolved?.channels !== undefined) {
            for (const id in data.resolved.channels) {
                this.resolved.channels.set(id, data.resolved.channels[id]);
            }
        }

        this.values = data.values;
    }
}
