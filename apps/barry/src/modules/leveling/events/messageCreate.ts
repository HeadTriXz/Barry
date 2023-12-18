import { type GatewayMessageCreateDispatchData, GatewayDispatchEvents } from "@discordjs/core";
import type { LevelingSettings } from "@prisma/client";
import type { PickRequired } from "../index.js";
import type LevelingModule from "../index.js";

import { DiscordAPIError } from "@discordjs/rest";
import { Event } from "@barry-bot/core";
import config from "../../../config.js";

/**
 * Represents dispatch data of the 'MESSAGE_CREATE' event in a guild.
 */
type GuildMessageCreateDispatchData = PickRequired<GatewayMessageCreateDispatchData, "guild_id">;

/**
 * A regular expression that matches messages that contain a "thank you".
 */
const THANKS_REGEX = /(?:|\s)(?:thank(?:s| you)|ty|thn?x|cheers)(?:\s|)/i;

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

        const settings = await this.module.settings.getOrCreate(message.guild_id);
        if (this.#isBlacklisted(message, settings)) {
            return;
        }
        const key = `lastMessage:${message.author.id}:${message.guild_id}`;
        if (!this.client.cooldowns.has(key)) {
            await this.#addExperience(message);

            this.client.cooldowns.set(key, 60000);
        }

        if (settings.messageRep) {
            await this.#addReputation(message);
        }
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
     * Adds reputation to the user if their message contains a "thank you".
     *
     * @param message The message data received from the gateway.
     */
    async #addReputation(message: GuildMessageCreateDispatchData): Promise<void> {
        const cooldownKey = `${message.guild_id ?? "global"}:Give Reputation:${message.author.id}`;
        if (this.client.cooldowns.has(cooldownKey)) {
            return;
        }

        const mention = message.mentions[0] ?? message.referenced_message?.author;
        if (mention === undefined || mention.bot || mention.id === message.author.id) {
            return;
        }

        if (!THANKS_REGEX.test(message.content)) {
            return;
        }

        await this.module.memberActivity.increment(message.guild_id, mention.id, {
            reputation: 1
        });

        await this.client.api.channels.createMessage(message.channel_id, {
            allowed_mentions: {
                replied_user: false,
                parse: []
            },
            content: `${config.emotes.check} Gave +1 rep to <@${mention.id}>.`,
            message_reference: {
                message_id: message.id
            }
        });

        this.client.cooldowns.set(cooldownKey, 86400000);
    }

    /**
     * Checks if the user (or channel) is blacklisted from receiving experience points.
     *
     * @param message The message data received from the gateway.
     * @returns Whether the user is blacklisted.
     */
    #isBlacklisted(message: GuildMessageCreateDispatchData, settings: LevelingSettings): boolean {
        return !settings.enabled
            || settings.ignoredChannels.includes(message.channel_id)
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
