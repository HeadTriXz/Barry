import type { Prisma, PrismaClient, RewardsSettings } from "@prisma/client";
import type { SettingsRepository } from "../../../../../types/modules.js";

/**
 * Repository class for managing settings for the rewards module.
 */
export class RewardsSettingsRepository implements SettingsRepository<RewardsSettings> {
    /**
     * The Prisma client used to interact with the database.
     */
    #prisma: PrismaClient;

    /**
     * Repository class for managing settings for the rewards module.
     *
     * @param prisma The Prisma client used to interact with the database.
     */
    constructor(prisma: PrismaClient) {
        this.#prisma = prisma;
    }

    /**
     * If a record exists for the specified guild, return it, otherwise create a new one.
     *
     * @param guildID The ID of the guild.
     * @returns The rewards settings record.
     */
    async getOrCreate(guildID: string): Promise<RewardsSettings> {
        return this.#prisma.rewardsSettings.upsert({
            create: { guildID },
            update: {},
            where: { guildID }
        });
    }

    /**
     * Upserts the provided rewards settings record.
     *
     * @param guildID The ID of the guild.
     * @param settings The rewards settings to upsert.
     * @returns The upserted rewards settings record.
     */
    async upsert(guildID: string, settings: Omit<Prisma.RewardsSettingsCreateInput, "guildID">): Promise<RewardsSettings> {
        return this.#prisma.rewardsSettings.upsert({
            create: { ...settings, guildID },
            update: settings,
            where: { guildID }
        });
    }
}
