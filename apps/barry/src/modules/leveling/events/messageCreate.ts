import { type GatewayMessageCreateDispatchData, GatewayDispatchEvents } from "@discordjs/core";
import type { PickRequired } from "../index.js";
import type LevelingModule from "../index.js";

import { DiscordAPIError } from "@discordjs/rest";
import { Event } from "@barry/core";

/**
 * Represents dispatch data of the 'MESSAGE_CREATE' event in a guild.
 */
type GuildMessageCreateDispatchData = PickRequired<GatewayMessageCreateDispatchData, "guild_id">;

/**
 * Tracks user activity and assigns experience and levels based on their participation in the guild.
 */
export default class extends Event<LevelingModule> {
    /**
     * Tracks user activity and assigns experience and levels based on their participation in the guild.
     *
     * @param module The module the event belongs to.
     */
    constructor(module: LevelingModule) {
        super(module, GatewayDispatchEvents.MessageCreate);
    }

    /**
     * Adds experience to the user and updates their level if necessary.
     *
     * @param message The message data received from the gateway.
     */
    async execute(message: GatewayMessageCreateDispatchData): Promise<void> {
        if (!this.#isValid(message)) {
            return;
        }

        const key = `lastMessage:${message.author.id}:${message.guild_id}`;
        if (this.client.cooldowns.has(key)) {
            return;
        }

        const blacklisted = await this.#isBlacklisted(message);
        if (blacklisted) {
            return;
        }

        await this.#addExperience(message);
        this.client.cooldowns.set(key, 60000);
    }

    /**
     * Adds experience to the user and updates their level if necessary.
     *
     * @param message The message data received from the gateway.
     */
    async #addExperience(message: GuildMessageCreateDispatchData): Promise<void> {
        try {
            const xpToAdd = Math.round(Math.random() * 10 + 15);
            const entity = await this.module.memberActivity.increment(message.guild_id, message.author.id, {
                experience: xpToAdd,
                messageCount: 1
            });

            await this.module.checkLevel(entity, message.channel_id);
        } catch (error: unknown) {
            if (error instanceof DiscordAPIError && error.code === 50007) {
                return;
            }

            this.client.logger.error(error);
        }
    }

    /**
     * Checks if the user (or channel) is blacklisted from receiving experience points.
     *
     * @param message The message data received from the gateway.
     * @returns Whether the user is blacklisted.
     */
    async #isBlacklisted(message: GuildMessageCreateDispatchData): Promise<boolean> {
        const settings = await this.module.levelingSettings.getOrCreate(message.guild_id);
        return settings.ignoredChannels.includes(message.channel_id)
            || settings.ignoredRoles.some((id) => message.member?.roles.includes(id));
    }

    /**
     * Checks if the message data is valid for processing.
     *
     * @param message The message data received from the gateway.
     * @returns Whether the message data is valid.
     */
    #isValid(message: GatewayMessageCreateDispatchData): message is GuildMessageCreateDispatchData {
        return message.guild_id !== undefined && !message.author.bot;
    }
}
