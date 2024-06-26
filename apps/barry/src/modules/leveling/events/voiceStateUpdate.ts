import { type GatewayVoiceState, GatewayDispatchEvents } from "@discordjs/core";
import type { PickRequired } from "../index.js";
import type LevelingModule from "../index.js";

import { Event } from "@barry-bot/core";
import { DiscordAPIError } from "@discordjs/rest";

/**
 * Represents dispatch data of the 'VOICE_STATE_UPDATE' event in a guild.
 */
type GuildGatewayVoiceState = PickRequired<GatewayVoiceState, "guild_id">;

/**
 * Represents the type of voice channel update.
 */
enum VoiceChannelUpdateType {
    JOIN = 1 << 0,
    LEAVE = 1 << 1
}

/**
 * Represents an event handler that tracks user voice activity.
 */
export default class extends Event<LevelingModule> {
    /**
     * Represents an event handler that tracks user voice activity.
     *
     * @param module The module this event belongs to.
     */
    constructor(module: LevelingModule) {
        super(module, GatewayDispatchEvents.VoiceStateUpdate);
    }

    /**
     * Updates the voice minutes for a user based on their voice activity.
     *
     * @param state The voice state data received from the gateway.
     * @param channelID The ID of the previous channel the user was in.
     */
    async execute(state: GatewayVoiceState, channelID?: string): Promise<void> {
        if (!this.#isValid(state, channelID)) {
            return;
        }

        const type = this.#getType(state, channelID);
        if (type & VoiceChannelUpdateType.LEAVE) {
            await this.#updateVoiceMinutes(state.guild_id, state.user_id, channelID);
        }

        if (type & VoiceChannelUpdateType.JOIN) {
            const blacklisted = await this.#isBlacklisted(state, state.channel_id!);
            if (blacklisted) {
                return;
            }

            await this.client.redis.set(`voice:${state.guild_id}:${state.user_id}`, Date.now());
        }
    }

    /**
     * Gets the type of voice channel update.
     *
     * @param state The voice state data received from the gateway.
     * @param channelID The ID of the previous channel the user was in.
     * @returns The type of voice channel update.
     */
    #getType(state: GatewayVoiceState, channelID?: string): VoiceChannelUpdateType {
        let type = 0;
        if (state.channel_id !== null) {
            type |= VoiceChannelUpdateType.JOIN;
        }

        if (channelID !== undefined || state.channel_id === null) {
            type |= VoiceChannelUpdateType.LEAVE;
        }

        return type;
    }

    /**
     * Checks if the user (or channel) is blacklisted from receiving experience points.
     *
     * @param state The voice state data received from the gateway.
     * @param channelID The ID of the previous channel the user was in.
     * @returns Whether the user is blacklisted.
     */
    async #isBlacklisted(state: GuildGatewayVoiceState, channelID?: string): Promise<boolean> {
        const settings = await this.module.settings.getOrCreate(state.guild_id);
        return !settings.enabled
            || (channelID !== undefined && settings.ignoredChannels.includes(channelID))
            || (state.member !== undefined && settings.ignoredRoles.some((id) => state.member?.roles.includes(id)));
    }

    /**
     * Checks if the state update data is valid for processing.
     *
     * @param state The voice state data received from the gateway.
     * @param channelID The ID of the previous channel the user was in.
     * @returns Whether the state update data is valid.
     */
    #isValid(state: GatewayVoiceState, channelID?: string): state is GuildGatewayVoiceState {
        return state.guild_id !== undefined && state.channel_id !== channelID;
    }

    /**
     * Calculates and updates the total voice minutes for a member in the guild.
     *
     * @param guildID The ID of the guild.
     * @param userID The ID of the user.
     * @param channelID The ID of the channel the user was connected to.
     */
    async #updateVoiceMinutes(guildID: string, userID: string, channelID?: string): Promise<void> {
        try {
            const currentTime = Date.now();
            const key = `voice:${guildID}:${userID}`;

            const voiceStartTime = await this.client.redis.get(key);
            if (voiceStartTime === null) {
                return;
            }

            await this.client.redis.del(key);

            const startTime = Number(voiceStartTime);
            const totalMinutes = Math.trunc((currentTime - startTime) / 60000);
            const xpToAdd = Math.round(Math.random() * 5 + 5) * totalMinutes;

            const entity = await this.module.memberActivity.increment(guildID, userID, {
                experience: xpToAdd,
                voiceMinutes: totalMinutes
            });

            if (channelID !== undefined) {
                await this.module.checkLevel(entity, channelID);
            }
        } catch (error: unknown) {
            if (error instanceof DiscordAPIError && error.code === 50007) {
                return;
            }

            this.client.logger.error(error);
        }
    }
}
