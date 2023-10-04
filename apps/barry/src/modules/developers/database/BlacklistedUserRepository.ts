import type { PrismaClient } from "@prisma/client";

/**
 * Represents a repository for managing blacklisted users.
 */
export class BlacklistedUserRepository {
    /**
     * The Prisma client used to interact with the database.
     */
    #prisma: PrismaClient;

    /**
     * Represents a repository for managing blacklisted users.
     *
     * @param prisma The Prisma client used to interact with the database.
     */
    constructor(prisma: PrismaClient) {
        this.#prisma = prisma;
    }

    /**
     * Blacklists the specified user.
     *
     * @param userID The ID of the user to blacklist.
     */
    async blacklist(userID: string): Promise<void> {
        await this.#prisma.blacklistedUser.create({ data: { userID } });
    }

    /**
     * Checks if the specified user is blacklisted.
     *
     * @param userID The ID of the user to check.
     * @returns Whether the user is blacklisted.
     */
    async isBlacklisted(userID: string): Promise<boolean> {
        return this.#prisma.blacklistedUser
            .findUnique({ where: { userID } })
            .then((user) => user !== null);
    }

    /**
     * Removes the specified user from the blacklist.
     *
     * @param userID The ID of the user to unblacklist.
     */
    async unblacklist(userID: string): Promise<void> {
        await this.#prisma.blacklistedUser.delete({ where: { userID } });
    }
}
