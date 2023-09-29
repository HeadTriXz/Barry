import type {
    Prisma,
    PrismaClient,
    ReportsSettings
} from "@prisma/client";
import type { SettingsRepository } from "../../../../../types/modules.js";

/**
 * Represents a repository for managing settings of the reports module.
 */
export class ReportsSettingsRepository implements SettingsRepository<ReportsSettings> {
    /**
     * The Prisma client used to interact with the database.
     */
    #prisma: PrismaClient;

    /**
     * Represents a repository for managing settings of the reports module.
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
     * @returns The reports settings record.
     */
    async getOrCreate(guildID: string): Promise<ReportsSettings> {
        return this.#prisma.reportsSettings.upsert({
            create: { guildID },
            update: {},
            where: { guildID }
        });
    }

    /**
     * Upserts the provided reports settings record.
     *
     * @param guildID The ID of the guild.
     * @param settings The reports settings to upsert.
     * @returns The upserted reports settings record.
     */
    async upsert(guildID: string, settings: Omit<Prisma.RequestsSettingsCreateInput, "guildID">): Promise<ReportsSettings> {
        return this.#prisma.reportsSettings.upsert({
            create: { ...settings, guildID },
            update: settings,
            where: { guildID }
        });
    }
}
