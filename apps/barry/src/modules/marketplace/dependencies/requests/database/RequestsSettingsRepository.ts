import type {
    PrismaClient,
    RequestsSettings,
    Prisma
} from "@prisma/client";
import type { SettingsRepository } from "../../../../../types/modules.js";

/**
 * Repository class for managing settings for the requests module.
 */
export class RequestsSettingsRepository implements SettingsRepository<RequestsSettings> {
    /**
     * The Prisma client used to interact with the database.
     */
    #prisma: PrismaClient;

    /**
     * Repository class for managing settings for the requests module.
     */
    constructor(prisma: PrismaClient) {
        this.#prisma = prisma;
    }

    /**
     * If a record exists for the specified guild, return it, otherwise create a new one.
     *
     * @param guildID The ID of the guild.
     * @returns The requests settings record.
     */
    async getOrCreate(guildID: string): Promise<RequestsSettings> {
        return this.#prisma.requestsSettings.upsert({
            create: { guildID },
            update: {},
            where: { guildID }
        });
    }

    /**
     * Upserts the specified settings for the specified guild.
     *
     * @param guildID The ID of the guild.
     * @param settings The request settings to upsert.
     * @returns The upserted request settings record.
     */
    async upsert(guildID: string, settings: Partial<Prisma.RequestsSettingsCreateInput>): Promise<RequestsSettings> {
        return this.#prisma.requestsSettings.upsert({
            create: { ...settings, guildID },
            update: settings,
            where: { guildID }
        });
    }
}
