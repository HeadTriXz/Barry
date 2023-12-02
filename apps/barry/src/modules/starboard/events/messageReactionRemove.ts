import { type GatewayMessageReactionRemoveDispatchData, GatewayDispatchEvents } from "@discordjs/core";
import type StarboardModule from "../index.js";

import { Event } from "@barry-bot/core";

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
        super(module, GatewayDispatchEvents.MessageReactionRemove);
    }

    /**
     * Updates a starboard message.
     *
     * @param data The data for the event.
     */
    async execute(data: GatewayMessageReactionRemoveDispatchData): Promise<void> {
        if (data.guild_id === undefined) {
            return;
        }

        await this.module.updateMessage({
            channelID: data.channel_id,
            emoji: data.emoji,
            guildID: data.guild_id,
            messageID: data.message_id,
            userID: data.user_id
        });
    }
}
