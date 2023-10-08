import type {
    PrismaClient,
    LevelingSettings,
    Prisma
} from "@prisma/client";
import type { SettingsRepository } from "../../../types/modules.js";

/**
 * Repository class for managing settings for the leveling module.
 */
export class LevelingSettingsRepository implements SettingsRepository<LevelingSettings> {
    /**
     * The Prisma client used to interact with the database.
     */
    #prisma: PrismaClient;

    /**
     * Repository class for managing settings for the leveling module.
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
     * @returns The leveling settings record.
     */
    async getOrCreate(guildID: string): Promise<LevelingSettings> {
        return this.#prisma.levelingSettings.upsert({
            create: { guildID },
            update: {},
            where: { guildID }
        });
    }

    /**
     * Upserts the provided leveling settings record.
     *
     * @param guildID The ID of the guild.
     * @param settings The leveling settings to upsert.
     * @returns The upserted leveling settings record.
     */
    async upsert(guildID: string, settings: Omit<Prisma.LevelingSettingsCreateInput, "guildID">): Promise<LevelingSettings> {
        return this.#prisma.levelingSettings.upsert({
            create: { ...settings, guildID },
            update: settings,
            where: { guildID }
        });
    }
}
