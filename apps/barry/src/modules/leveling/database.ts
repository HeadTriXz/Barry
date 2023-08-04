import type {
    LevelUpSettings,
    LevelingSettings,
    MemberActivity,
    Prisma,
    PrismaClient
} from "@prisma/client";

/**
 * Options for retrieving a page of MemberActivity records.
 */
export interface MemberActivityPaginationOptions {
    /**
     * The maximum number of items to return per page.
     */
    limit?: number;

    /**
     * The page to retrieve.
     */
    page?: number;

    /**
     * The property to sort the results by.
     */
    sortBy?: MemberActivitySortBy;

    /**
     * The order to sort the results in.
     */
    sortOrder?: MemberActivitySortOrder;
}

/**
 * Enum representing the properties that can be used for sorting member activity records.
 */
export enum MemberActivitySortBy {
    Experience = "experience",
    Reputation = "reputation"
}

/**
 * Enum representing the order for sorting member activity records.
 */
export enum MemberActivitySortOrder {
    Ascending = "asc",
    Descending = "desc"
}

/**
 * Repository class for managing settings for the leveling module.
 */
export class LevelingSettingsRepository {
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
     * Creates a new leveling settings record for the specified guild.
     *
     * @param guildID The ID of the guild.
     * @returns The created leveling settings record.
     */
    async create(guildID: string): Promise<LevelingSettings> {
        return this.#prisma.levelingSettings.create({
            data: { guildID }
        });
    }

    /**
     * Retrieves the leveling settings record for the specified guild.
     *
     * @param guildID The ID of the guild.
     * @returns The leveling settings record, or null if not found.
     */
    async get(guildID: string): Promise<LevelingSettings | null> {
        return this.#prisma.levelingSettings.findUnique({
            where: { guildID }
        });
    }

    /**
     * If a record exists for the specified guild, return it, otherwise create a new one.
     *
     * @param guildID The ID of the guild.
     * @returns The leveling settings record.
     */
    async getOrCreate(guildID: string): Promise<LevelingSettings> {
        return await this.get(guildID) ?? await this.create(guildID);
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

/**
 * Repository class for managing level up settings.
 */
export class LevelUpSettingsRepository {
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
     * Creates a new level up settings record for the specified guild.
     *
     * @param guildID The ID of the guild.
     * @returns The created level up settings record.
     */
    async create(guildID: string): Promise<LevelUpSettings> {
        return this.#prisma.levelUpSettings.create({
            data: { guildID }
        });
    }

    /**
     * Retrieves the level up settings record for the specified guild.
     *
     * @param guildID The ID of the guild.
     * @returns The level up settings record, or null if not found.
     */
    async get(guildID: string): Promise<LevelUpSettings | null> {
        return this.#prisma.levelUpSettings.findUnique({
            where: { guildID }
        });
    }

    /**
     * If a record exists for the specified guild, return it, otherwise create a new one.
     *
     * @param guildID The ID of the guild.
     * @returns The level up settings record.
     */
    async getOrCreate(guildID: string): Promise<LevelUpSettings> {
        return await this.get(guildID) ?? await this.create(guildID);
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

/**
 * Repository class for managing member activity records.
 */
export class MemberActivityRepository {
    /**
     * The Prisma client used to interact with the database.
     */
    #prisma: PrismaClient;

    /**
     * Repository class for managing member activity records.
     *
     * @param prisma The Prisma client used to interact with the database.
     */
    constructor(prisma: PrismaClient) {
        this.#prisma = prisma;
    }

    /**
     * Counts the amount of registered members for the specified guild.
     *
     * @param guildID The ID of the guild.
     * @returns The amount of registered members.
     */
    async count(guildID: string): Promise<number> {
        return this.#prisma.memberActivity.count({
            where: { guildID }
        });
    }

    /**
     * Creates a new member activity record for the specified member.
     *
     * @param guildID The ID of the guild.
     * @param userID The ID of the user.
     * @returns The created member activity record.
     */
    async create(guildID: string, userID: string): Promise<MemberActivity> {
        return this.#prisma.memberActivity.create({
            data: { guildID, userID }
        });
    }

    /**
     * Retrieves the member activity record for the specified member.
     *
     * @param guildID The ID of the guild.
     * @param userID The ID of the user.
     * @returns The member activity record, or null if not found.
     */
    async get(guildID: string, userID: string): Promise<MemberActivity | null> {
        return this.#prisma.memberActivity.findUnique({
            where: {
                guildID_userID: { guildID, userID }
            }
        });
    }

    /**
     * Retrieves all member activity records for the specified guild with pagination and sorting.
     *
     * @param guildID The ID of the guild.
     * @param options The options for pagination and sorting.
     * @returns An array of member activity records.
     */
    async getAll(guildID: string, {
        limit = 10,
        page = 1,
        sortBy = MemberActivitySortBy.Experience,
        sortOrder = MemberActivitySortOrder.Descending
    }: MemberActivityPaginationOptions): Promise<MemberActivity[]> {
        return this.#prisma.memberActivity.findMany({
            orderBy: [{
                [sortBy]: sortOrder
            }],
            skip: limit * (page - 1),
            take: limit,
            where: { guildID }
        });
    }

    /**
     * If a record exists for the specified guild, return it, otherwise create a new one.
     *
     * @param guildID The ID of the guild.
     * @param userID The ID of the user.
     * @returns The member activity record.
     */
    async getOrCreate(guildID: string, userID: string): Promise<MemberActivity> {
        return await this.get(guildID, userID) ?? await this.create(guildID, userID);
    }

    /**
     * Increments the specified properties, or creates a new record if it does not exist.
     *
     * @param guildID The ID of the guild.
     * @param userID The ID of the user.
     * @param options The properties and their increment values to be updated or created.
     * @returns The updated member activity record.
     */
    async increment(
        guildID: string,
        userID: string,
        options: Omit<Prisma.MemberActivityCreateInput, "guildID" | "userID">
    ): Promise<MemberActivity> {
        const createData: Prisma.MemberActivityCreateInput = { guildID, userID, ...options };
        const updateData: Prisma.MemberActivityUpdateInput = {};

        for (const key in options) {
            updateData[key as keyof typeof options] = {
                increment: options[key as keyof typeof options]
            };
        }

        return this.#prisma.memberActivity.upsert({
            create: createData,
            update: updateData,
            where: {
                guildID_userID: { guildID, userID }
            }
        });
    }

    /**
     * Upserts the provided member activity record.
     *
     * @param options The member activity data to upsert.
     * @returns The upserted member activity record.
     */
    async upsert(
        guildID: string,
        userID: string,
        options: Omit<Prisma.MemberActivityCreateInput, "guildID" | "userID">
    ): Promise<MemberActivity> {
        return this.#prisma.memberActivity.upsert({
            create: { guildID, userID, ...options },
            update: options,
            where: {
                guildID_userID: { guildID, userID }
            }
        });
    }
}
