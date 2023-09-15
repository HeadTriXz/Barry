import type {
    Prisma,
    PrismaClient,
    Profile,
    ProfileMessage,
    ProfilesSettings
} from "@prisma/client";

/**
 * Represents a profile record with its messages.
 */
export type ProfileWithMessages = Profile & { messages: ProfileMessage[] };

/**
 * Repository class for managing settings for the profiles module.
 */
export class ProfilesSettingsRepository {
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
     * Creates a new profiles settings record for the specified guild.
     *
     * @param guildID The ID of the guild.
     * @returns The created profiles settings record.
     */
    async create(guildID: string): Promise<ProfilesSettings> {
        return this.#prisma.profilesSettings.create({
            data: { guildID }
        });
    }

    /**
     * Retrieves the profiles settings record for the specified guild.
     *
     * @param guildID The ID of the guild.
     * @returns The profiles settings record, or null if not found.
     */
    async get(guildID: string): Promise<ProfilesSettings | null> {
        return this.#prisma.profilesSettings.findUnique({
            where: { guildID }
        });
    }

    /**
     * If a record exists for the specified guild, return it, otherwise create a new one.
     *
     * @param guildID The ID of the guild.
     * @returns The profiles settings record.
     */
    async getOrCreate(guildID: string): Promise<ProfilesSettings> {
        return await this.get(guildID) ?? await this.create(guildID);
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

/**
 * Repository class for managing profiles.
 */
export class ProfileRepository {
    /**
     * The Prisma client used to interact with the database.
     */
    #prisma: PrismaClient;

    /**
     * Repository class for managing profiles.
     *
     * @param prisma The Prisma client used to interact with the database.
     */
    constructor(prisma: PrismaClient) {
        this.#prisma = prisma;
    }

    /**
     * Creates a new profile record for the specified user.
     *
     * @param userID The ID of the user.
     * @returns The created profile record.
     */
    async create(options: Prisma.ProfileCreateInput): Promise<Profile> {
        return this.#prisma.profile.create({ data: options });
    }

    /**
     * Retrieves the profile record for the specified user.
     *
     * @param userID The ID of the user.
     * @returns The profile record, or null if not found.
     */
    async get(userID: string): Promise<Profile | null> {
        return this.#prisma.profile.findUnique({
            where: { userID }
        });
    }

    /**
     * Retrieves the profile record for the specified profile message.
     *
     * @param messageID The ID of the message.
     * @returns The profile record, or null if not found.
     */
    async getByMessage(messageID: string): Promise<Profile | null> {
        return this.#prisma.profile.findFirst({
            where: {
                messages: {
                    some: { messageID }
                }
            }
        });
    }

    /**
     * Retrieves the profile record with the flaggable messages for the specified user.
     *
     * @param guildID The ID of the guild.
     * @param userID The ID of the user.
     * @param maxDays The amount of days to get profiles for.
     * @returns The profile record with messages, or null if not found.
     */
    async getWithFlaggableMessages(
        guildID: string,
        userID: string,
        maxDays: number = 14
    ): Promise<ProfileWithMessages | null> {
        const milliseconds = maxDays * 86400000;
        const timestamp = BigInt(Date.now() - milliseconds - 1420070400000);
        const minimumID = String(timestamp << 22n);

        return this.#prisma.profile.findUnique({
            include: {
                messages: {
                    where: {
                        guildID: guildID,
                        messageID: {
                            gte: minimumID
                        }
                    }
                }
            },
            where: { userID }
        });
    }

    /**
     * Retrieves the profile record with its messages for the specified user.
     *
     * @param guildID The ID of the guild.
     * @param userID The ID of the user.
     * @returns The profile record with messages, or null if not found.
     */
    async getWithMessages(guildID: string, userID: string): Promise<ProfileWithMessages | null> {
        return this.#prisma.profile.findUnique({
            include: {
                messages: {
                    where: { guildID }
                }
            },
            where: { userID }
        });
    }

    /**
     * Upserts the provided profile record.
     *
     * @param userID The ID of the user.
     * @param options The profile data to upsert.
     * @returns The upserted profile record.
     */
    async upsert(userID: string, options: Partial<Prisma.ProfileCreateInput>): Promise<Profile> {
        return this.#prisma.profile.upsert({
            create: {
                about: "",
                userID: userID,
                ...options
            },
            update: options,
            where: { userID }
        });
    }
}

/**
 * Repository class for managing profile messages.
 */
export class ProfileMessageRepository {
    /**
     * The Prisma client used to interact with the database.
     */
    #prisma: PrismaClient;

    /**
     * Repository class for managing profile messages.
     *
     * @param prisma The Prisma client used to interact with the database.
     */
    constructor(prisma: PrismaClient) {
        this.#prisma = prisma;
    }

    /**
     * Creates a new profile message record.
     *
     * @param messageID The ID of the message.
     * @param guildID The ID of the guild.
     * @param userID The ID of the user.
     * @returns The created profile message record.
     */
    async create(messageID: string, guildID: string, userID: string): Promise<ProfileMessage> {
        return this.#prisma.profileMessage.create({
            data: {
                guildID,
                messageID,
                userID
            }
        });
    }

    /**
     * Retrieves the latest profile message for a user in a guild.
     *
     * @param guildID The ID of the guild.
     * @param userID The ID of the user.
     * @returns The latest profile message, or null if not found.
     */
    async getLatest(guildID: string, userID: string): Promise<ProfileMessage | null> {
        return this.#prisma.profileMessage.findFirst({
            orderBy: { messageID: "desc" },
            where: { guildID, userID }
        });
    }
}
