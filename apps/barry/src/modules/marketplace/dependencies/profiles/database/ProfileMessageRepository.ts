import type { PrismaClient, ProfileMessage } from "@prisma/client";

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
