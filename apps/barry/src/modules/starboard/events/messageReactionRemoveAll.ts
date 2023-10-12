import { type GatewayMessageReactionRemoveAllDispatchData, GatewayDispatchEvents } from "@discordjs/core";
import type StarboardModule from "../index.js";

import { Event } from "@barry/core";

/**
 * Represents an event handler for updating a starboard message.
 */
export default class extends Event<StarboardModule> {
    /**
     * Represents an event handler for updating a starboard message.
     *
     * @param module The module this event belongs to.
     */
    constructor(module: StarboardModule) {
        super(module, GatewayDispatchEvents.MessageReactionRemoveAll);
    }

    /**
     * Updates a starboard message.
     *
     * @param data The data for the event.
     */
    async execute(data: GatewayMessageReactionRemoveAllDispatchData): Promise<void> {
        if (data.guild_id === undefined) {
            return;
        }

        const message = await this.module.messages.get(data.channel_id, data.message_id);
        if (message !== null) {
            if (message.crosspostID !== null) {
                return this.module.reactions.deleteAll(data.channel_id, data.message_id);
            }

            return this.module.messages.delete(data.channel_id, data.message_id);
        }
    }
}
