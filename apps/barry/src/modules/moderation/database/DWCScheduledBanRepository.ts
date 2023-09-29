import type { PrismaClient, DWCScheduledBan } from "@prisma/client";

/**
 * Represents an expired scheduled ban.
 */
export interface ExpiredDWCScheduledBan {
    /**
     * The channel in which to log the case.
     */
    channel_id: string | null;

    /**
     * When the user got flagged.
     */
    created_at: Date;

    /**
     * The ID of the DWC role.
     */
    dwc_role_id: string | null;

    /**
     * The ID of the guild.
     */
    guild_id: string;

    /**
     * The ID of the user.
     */
    user_id: string;
}

/**
 * Repository class for managing scheduled bans.
 */
export class DWCScheduledBanRepository {
    /**
     * The Prisma client used to interact with the database.
     */
    #prisma: PrismaClient;

    /**
     * Repository class for managing scheduled bans.
     *
     * @param prisma The Prisma client used to interact with the database.
     */
    constructor(prisma: PrismaClient) {
        this.#prisma = prisma;
    }

    /**
     * Creates a new scheduled ban for the specified user.
     *
     * @param guildID The ID of the guild.
     * @param userID The ID of the user.
     * @returns The new scheduled ban record.
     */
    async create(guildID: string, userID: string): Promise<DWCScheduledBan> {
        return this.#prisma.dWCScheduledBan.create({
            data: { guildID, userID }
        });
    }

    /**
     * Deletes a scheduled ban.
     *
     * @param guildID The ID of the guild.
     * @param userID The ID of the user.
     * @returns The deleted ban.
     */
    async delete(guildID: string, userID: string): Promise<DWCScheduledBan> {
        return this.#prisma.dWCScheduledBan.delete({
            where: {
                guildID_userID: { guildID, userID }
            }
        });
    }

    /**
     * Retrieves the scheduled ban for a user.
     *
     * @param guildID The ID of the guild.
     * @param userID The ID of the user.
     * @returns The scheduled ban, or null if not found.
     */
    async get(guildID: string, userID: string): Promise<DWCScheduledBan | null> {
        return this.#prisma.dWCScheduledBan.findUnique({
            where: {
                guildID_userID: { guildID, userID }
            }
        });
    }

    /**
     * Retrieves all scheduled bans that are due for executing.
     *
     * @returns An array of scheduled bans.
     */
    async getExpired(): Promise<ExpiredDWCScheduledBan[]> {
        return this.#prisma.$queryRaw<ExpiredDWCScheduledBan[]>`
            SELECT d.*, s.channel_id, s.dwc_role_id
            FROM dwc_scheduled_bans AS d
                INNER JOIN moderation_settings AS s
                ON s.guild_id = d.guild_id
            WHERE d.created_at <= NOW() + (s.dwc_days * INTERVAL '1 day');
        `;
    }
}
