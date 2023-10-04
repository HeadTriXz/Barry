import type { Application } from "../../Application.js";
import type { BlacklistableModule } from "../../types/blacklist.js";

import { BlacklistedGuildRepository } from "./database/BlacklistedGuildRepository.js";
import { BlacklistedUserRepository } from "./database/BlacklistedUserRepository.js";
import { Module } from "@barry/core";
import { loadCommands } from "../../utils/index.js";

/**
 * Represents the developers module.
 */
export default class DevelopersModule extends Module<Application> implements BlacklistableModule {
    /**
     * Represents the repository for managing blacklisted guilds.
     */
    blacklistedGuilds: BlacklistedGuildRepository;

    /**
     * Represents the repository for managing blacklisted users.
     */
    blacklistedUsers: BlacklistedUserRepository;

    /**
     * Represents the developers module.
     *
     * @param client The client that initialized the module.
     */
    constructor(client: Application) {
        super(client, {
            id: "developers",
            name: "Developers",
            description: "A set of useful tools for the developers of Barry.",
            commands: loadCommands("./commands")
        });

        this.blacklistedGuilds = new BlacklistedGuildRepository(client.prisma);
        this.blacklistedUsers = new BlacklistedUserRepository(client.prisma);
    }

    /**
     * Checks if the guild has enabled this module.
     *
     * @returns Whether the guild has enabled this module.
     */
    isEnabled(): boolean {
        return true;
    }
}
