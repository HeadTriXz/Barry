import type { PrismaClient, RequestMessage } from "@prisma/client";

/**
 * Repository class for managing request messages.
 */
export class RequestMessageRepository {
    /**
     * The Prisma client used to interact with the database.
     */
    #prisma: PrismaClient;

    /**
     * Repository class for managing request messages.
     */
    constructor(prisma: PrismaClient) {
        this.#prisma = prisma;
    }

    /**
     * Creates a new request message record.
     *
     * @param messageID The ID of the message.
     * @param guildID The ID of the guild.
     * @param requestID The ID of the request.
     * @returns The created request message record.
     */
    async create(messageID: string, guildID: string, requestID: number): Promise<RequestMessage> {
        return this.#prisma.requestMessage.create({
            data: {
                guildID,
                messageID,
                requestID
            }
        });
    }

    /**
     * Retrieves the latest request message record for the specified request.
     *
     * @param guildID The ID of the guild.
     * @param requestID The ID of the request.
     * @returns The latest request message record, or null if not found.
     */
    async getLatest(guildID: string, requestID: number): Promise<RequestMessage | null> {
        return this.#prisma.requestMessage.findFirst({
            orderBy: { messageID: "desc" },
            where: { guildID, requestID }
        });
    }
}
