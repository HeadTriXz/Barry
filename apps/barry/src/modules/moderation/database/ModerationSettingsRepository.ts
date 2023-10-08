import type {
    PrismaClient,
    ModerationSettings,
    Prisma
} from "@prisma/client";
import type { SettingsRepository } from "../../../types/modules.js";

/**
 * Repository class for managing settings for the moderation module.
 */
export class ModerationSettingsRepository implements SettingsRepository<ModerationSettings> {
    /**
     * The Prisma client used to interact with the database.
     */
    #prisma: PrismaClient;

    /**
     * Repository class for managing settings for the moderation module.
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
     * @returns The moderation settings record.
     */
    async getOrCreate(guildID: string): Promise<ModerationSettings> {
        return this.#prisma.moderationSettings.upsert({
            create: { guildID },
            update: {},
            where: { guildID }
        });
    }

    /**
     * Upserts the moderation settings for the specified guild.
     *
     * @param guildID The ID of the guild.
     * @param settings The moderation settings to update.
     * @returns The updated moderation settings record.
     */
    async upsert(
        guildID: string,
        settings: Partial<Prisma.ModerationSettingsCreateInput>
    ): Promise<ModerationSettings> {
        return this.#prisma.moderationSettings.upsert({
            create: { ...settings, guildID },
            update: settings,
            where: { guildID }
        });
    }
}
