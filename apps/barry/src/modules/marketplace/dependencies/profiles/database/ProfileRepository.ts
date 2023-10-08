import type {
    Profile,
    ProfileMessage,
    PrismaClient,
    Prisma
} from "@prisma/client";

/**
 * Represents a profile record with its messages.
 */
export interface ProfileWithMessages extends Profile {
    /**
     * The messages for the profile.
     */
    messages: ProfileMessage[];
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
