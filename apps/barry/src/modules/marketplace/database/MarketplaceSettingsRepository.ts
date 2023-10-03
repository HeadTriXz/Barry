import type { MarketplaceSettings, Prisma, PrismaClient } from "@prisma/client";
import type { SettingsRepository } from "../../../types/modules.js";

/**
 * Represents a repository for managing settings of the marketplace module.
 */
export class MarketplaceSettingsRepository implements SettingsRepository<MarketplaceSettings> {
    /**
     * The Prisma client used to interact with the database.
     */
    #prisma: PrismaClient;

    /**
     * Represents a repository for managing settings of the marketplace module.
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
     * @returns The marketplace settings record.
     */
    async getOrCreate(guildID: string): Promise<MarketplaceSettings> {
        return this.#prisma.marketplaceSettings.upsert({
            create: { guildID },
            update: {},
            where: { guildID }
        });
    }

    /**
     * Upserts the provided marketplace settings record.
     *
     * @param guildID The ID of the guild.
     * @param settings The marketplace settings to upsert.
     * @returns The upserted marketplace settings record.
     */
    async upsert(guildID: string, settings: Omit<Prisma.MarketplaceSettingsCreateInput, "guildID">): Promise<MarketplaceSettings> {
        return this.#prisma.marketplaceSettings.upsert({
            create: { guildID, ...settings },
            update: settings,
            where: { guildID }
        });
    }
}
