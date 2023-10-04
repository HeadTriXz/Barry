import type { PrismaClient } from "@prisma/client";

/**
 * Represents a repository for managing blacklisted guilds.
 */
export class BlacklistedGuildRepository {
    /**
     * The Prisma client used to interact with the database.
     */
    #prisma: PrismaClient;

    /**
     * Represents a repository for managing blacklisted guilds.
     *
     * @param prisma The Prisma client used to interact with the database.
     */
    constructor(prisma: PrismaClient) {
        this.#prisma = prisma;
    }

    /**
     * Blacklists the specified guild.
     *
     * @param guildID The ID of the guild to blacklist.
     */
    async blacklist(guildID: string): Promise<void> {
        await this.#prisma.blacklistedGuild.create({ data: { guildID } });
    }

    /**
     * Checks if the specified guild is blacklisted.
     *
     * @param guildID The ID of the guild to check.
     * @returns Whether the guild is blacklisted.
     */
    async isBlacklisted(guildID: string): Promise<boolean> {
        return this.#prisma.blacklistedGuild
            .findUnique({ where: { guildID } })
            .then((guild) => guild !== null);
    }

    /**
     * Removes the specified guild from the blacklist.
     *
     * @param guildID The ID of the guild to unblacklist.
     */
    async unblacklist(guildID: string): Promise<void> {
        await this.#prisma.blacklistedGuild.delete({ where: { guildID } });
    }
}
