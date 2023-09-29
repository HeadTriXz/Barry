import type {
    PrismaClient,
    ProfilesSettings,
    Prisma
} from "@prisma/client";
import type { SettingsRepository } from "../../../../../types/modules.js";

/**
 * Repository class for managing settings for the profiles module.
 */
export class ProfilesSettingsRepository implements SettingsRepository<ProfilesSettings> {
    /**
     * The Prisma client used to interact with the database.
     */
    #prisma: PrismaClient;

    /**
     * Repository class for managing settings for the profiles module.
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
     * @returns The profiles settings record.
     */
    async getOrCreate(guildID: string): Promise<ProfilesSettings> {
        return this.#prisma.profilesSettings.upsert({
            create: { guildID },
            update: {},
            where: { guildID }
        });
    }

    /**
     * Upserts the provided profiles settings record.
     *
     * @param guildID The ID of the guild.
     * @param settings The profiles settings to upsert.
     * @returns The upserted profiles settings record.
     */
    async upsert(guildID: string, settings: Omit<Prisma.ProfilesSettingsCreateInput, "guildID">): Promise<ProfilesSettings> {
        return this.#prisma.profilesSettings.upsert({
            create: { ...settings, guildID },
            update: settings,
            where: { guildID }
        });
    }
}
