import { type APIGuild, GatewayDispatchEvents } from "@discordjs/core";
import type DevelopersModule from "../index.js";

import { Event } from "@barry/core";

/**
 * Represents the guild create event to leave blacklisted guilds.
 */
export default class extends Event<DevelopersModule> {
    /**
     * Represents the guild create event to leave blacklisted guilds.
     *
     * @param module The module this event belongs to.
     */
    constructor(module: DevelopersModule) {
        super(module, GatewayDispatchEvents.GuildCreate);
    }

    /**
     * Checks if the guild is blacklisted, then leaves it.
     *
     * @param guild The guild that was created.
     */
    async execute(guild: APIGuild): Promise<void> {
        const isBlacklisted = await this.module.blacklistedGuilds.isBlacklisted(guild.id);
        if (isBlacklisted) {
            await this.client.api.users.leaveGuild(guild.id);
        }
    }
}
