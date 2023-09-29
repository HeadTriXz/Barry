import type { PrismaClient, TempBan } from "@prisma/client";

/**
 * Repository class for managing temporary bans.
 */
export class TempBanRepository {
    /**
     * The Prisma client used to interact with the database.
     */
    #prisma: PrismaClient;

    /**
     * Repository class for managing temporary bans.
     *
     * @param prisma The Prisma client used to interact with the database.
     */
    constructor(prisma: PrismaClient) {
        this.#prisma = prisma;
    }

    /**
     * Creates a new temporary ban.
     *
     * @param guildID The ID of the guild.
     * @param userID The ID of the user.
     * @param duration The duration of the ban in seconds.
     * @returns The new temporary ban record.
     */
    async create(guildID: string, userID: string, duration: number): Promise<TempBan> {
        const expiresAt = new Date(Date.now() + duration * 1000);
        return this.#prisma.tempBan.create({
            data: {
                expiresAt,
                guildID,
                userID
            }
        });
    }

    /**
     * Deletes a temporary ban.
     *
     * @param guildID The ID of the guild.
     * @param userID The ID of the user.
     * @returns The deleted temporary ban record.
     */
    async delete(guildID: string, userID: string): Promise<TempBan> {
        return this.#prisma.tempBan.delete({
            where: { guildID_userID: { guildID, userID } }
        });
    }

    /**
     * Retrieves a temporary ban for a user.
     *
     * @param guildID The ID of the guild.
     * @param userID The ID of the user.
     * @returns The temporary ban record, or null if not found.
     */
    async get(guildID: string, userID: string): Promise<TempBan | null> {
        return this.#prisma.tempBan.findUnique({
            where: { guildID_userID: { guildID, userID } }
        });
    }

    /**
     * Retrieves all expired temporary bans for the specified guild.
     *
     * @returns The expired temporary ban records.
     */
    async getExpired(): Promise<TempBan[]> {
        return this.#prisma.tempBan.findMany({
            where: { expiresAt: { lte: new Date() } }
        });
    }

    /**
     * Updates a temporary ban.
     *
     * @param guildID The ID of the guild.
     * @param userID The ID of the user.
     * @param duration The new duration of the ban in seconds.
     * @returns The updated temporary ban record.
     */
    async update(guildID: string, userID: string, duration: number): Promise<TempBan> {
        return this.#prisma.tempBan.update({
            data: { expiresAt: new Date(Date.now() + duration * 1000) },
            where: { guildID_userID: { guildID, userID } }
        });
    }
}
