import type {
    PrismaClient,
    LevelUpSettings,
    Prisma
} from "@prisma/client";
import type { SettingsRepository } from "../../../types/modules.js";

/**
 * Repository class for managing level up settings.
 */
export class LevelUpSettingsRepository implements SettingsRepository<LevelUpSettings> {
    /**
     * The Prisma client used to interact with the database.
     */
    #prisma: PrismaClient;

    /**
     * Repository class for managing level up settings.
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
     * @returns The level up settings record.
     */
    async getOrCreate(guildID: string): Promise<LevelUpSettings> {
        return this.#prisma.levelUpSettings.upsert({
            create: { guildID },
            update: {},
            where: { guildID }
        });
    }

    /**
     * Upserts the provided level up settings record.
     *
     * @param guildID The ID of the guild.
     * @param settings The level up settings to upsert.
     * @returns The upserted level up settings record.
     */
    async upsert(guildID: string, settings: Omit<Prisma.LevelUpSettingsCreateInput, "guildID">): Promise<LevelUpSettings> {
        return this.#prisma.levelUpSettings.upsert({
            create: { ...settings, guildID },
            update: settings,
            where: { guildID }
        });
    }
}
