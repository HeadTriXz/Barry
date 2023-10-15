import {
    type GatewayGuildMemberAddDispatchData,
    GatewayDispatchEvents
} from "@discordjs/core";
import type WelcomerModule from "../index.js";

import { DiscordAPIError } from "@discordjs/rest";
import { Event } from "@barry/core";

/**
 * Represents an event handler for welcoming new members.
 */
export default class extends Event<WelcomerModule> {
    /**
     * Represents an event handler for welcoming new members.
     *
     * @param module The module this event belongs to.
     */
    constructor(module: WelcomerModule) {
        super(module, GatewayDispatchEvents.GuildMemberAdd);
    }

    /**
     * Welcomes a new member.
     *
     * @param member The member that joined.
     */
    async execute(member: GatewayGuildMemberAddDispatchData): Promise<void> {
        if (member.user === undefined) {
            return this.client.logger.warn("Received a 'GUILD_MEMBER_ADD' event without a user.");
        }

        const settings = await this.module.settings.getOrCreate(member.guild_id);
        if (!settings.enabled || settings.channelID === null) {
            return;
        }

        try {
            const content = await this.module.getContent(member.user, settings);
            await this.client.api.channels.createMessage(settings.channelID, content);
        } catch (error: unknown) {
            if (error instanceof DiscordAPIError && error.code === 10003) {
                await this.module.settings.upsert(member.guild_id, {
                    channelID: null
                });
            } else {
                this.client.logger.error(error);
            }
        }
    }
}
