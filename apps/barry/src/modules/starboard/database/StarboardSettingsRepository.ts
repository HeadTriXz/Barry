import type { Prisma, PrismaClient, StarboardSettings } from "@prisma/client";
import type { SettingsRepository } from "../../../types/modules.js";

/**
 * Repository class for managing settings for the starboard module.
 */
export class StarboardSettingsRepository implements SettingsRepository<StarboardSettings> {
    /**
     * The Prisma client used to interact with the database.
     */
    #prisma: PrismaClient;

    /**
     * Repository class for managing settings for the starboard module.
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
     * @returns The starboard settings record.
     */
    async getOrCreate(guildID: string): Promise<StarboardSettings> {
        return this.#prisma.starboardSettings.upsert({
            create: { guildID },
            update: {},
            where: { guildID }
        });
    }

    /**
     * Upserts the starboard settings for the specified guild.
     *
     * @param guildID The ID of the guild.
     * @param settings The starboard settings to update.
     * @returns The updated starboard settings record.
     */
    async upsert(guildID: string, settings: Omit<Prisma.StarboardSettingsCreateInput, "guildID">): Promise<StarboardSettings> {
        return this.#prisma.starboardSettings.upsert({
            create: { ...settings, guildID },
            update: settings,
            where: { guildID }
        });
    }
}
