import { type GatewayMessageCreateDispatchData, GatewayDispatchEvents } from "@discordjs/core";
import type StarboardModule from "../index.js";

import { DiscordAPIError } from "@discordjs/rest";
import { Event } from "@barry/core";

/**
 * Represents an event handler to automatically add stars to messages.
 */
export default class extends Event<StarboardModule> {
    /**
     * Represents an event handler to automatically add stars to messages.
     *
     * @param module The module this event belongs to.
     */
    constructor(module: StarboardModule) {
        super(module, GatewayDispatchEvents.MessageCreate);
    }

    /**
     * Automatically adds stars to messages.
     *
     * @param message The message that was created.
     */
    async execute(message: GatewayMessageCreateDispatchData): Promise<void> {
        if (message.guild_id === undefined) {
            return;
        }

        const image = this.module.getImage(message);
        if (image === undefined) {
            return;
        }

        const settings = await this.module.settings.getOrCreate(message.guild_id);
        if (!settings.enabled || !settings.autoReactChannels.includes(message.channel_id)) {
            return;
        }

        const emojiID = settings.emojiID !== null
            ? `${settings.emojiName}:${settings.emojiID}`
            : settings.emojiName;

        try {
            await this.client.api.channels.addMessageReaction(message.channel_id, message.id, emojiID);
        } catch (error: unknown) {
            if (error instanceof DiscordAPIError && error.code === 10014) {
                await this.module.settings.upsert(message.guild_id, {
                    emojiID: null,
                    emojiName: "\u2B50"
                });
            } else {
                this.client.logger.error(error);
            }
        }
    }
}
