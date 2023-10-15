import type { Prisma, PrismaClient, WelcomerSettings } from "@prisma/client";
import type { SettingsRepository } from "../../../types/modules.js";

/**
 * Represents a repository class for managing settings for the welcomer module.
 */
export class WelcomerSettingsRepository implements SettingsRepository<WelcomerSettings> {
    /**
     * The Prisma client used to interact with the database.
     */
    #prisma: PrismaClient;

    /**
     * Represents a repository class for managing settings for the welcomer module.
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
     * @returns The welcomer settings record.
     */
    async getOrCreate(guildID: string): Promise<WelcomerSettings> {
        return this.#prisma.welcomerSettings.upsert({
            create: { guildID },
            update: {},
            where: { guildID }
        });
    }

    /**
     * Upserts the welcomer settings for the specified guild.
     *
     * @param guildID The ID of the guild.
     * @param settings The welcomer settings to update.
     * @returns The updated welcomer settings record.
     */
    async upsert(guildID: string, settings: Omit<Prisma.WelcomerSettingsCreateInput, "guildID">): Promise<WelcomerSettings> {
        return this.#prisma.welcomerSettings.upsert({
            create: { ...settings, guildID },
            update: settings,
            where: { guildID }
        });
    }
}
