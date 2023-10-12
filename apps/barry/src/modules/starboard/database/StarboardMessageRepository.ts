import type { Prisma, PrismaClient, StarboardMessage } from "@prisma/client";

/**
 * Represents a repository for managing starboard messages.
 */
export class StarboardMessageRepository {
    /**
     * The Prisma client used to interact with the database.
     */
    #prisma: PrismaClient;

    /**
     * Represents a repository for managing starboard messages.
     *
     * @param prisma The Prisma client used to interact with the database.
     */
    constructor(prisma: PrismaClient) {
        this.#prisma = prisma;
    }

    /**
     * Creates a new starboard message.
     *
     * @param options The options for creating the starboard message.
     * @returns The created starboard message.
     */
    async create(options: Prisma.StarboardMessageCreateInput): Promise<StarboardMessage> {
        return this.#prisma.starboardMessage.create({ data: options });
    }

    /**
     * Deletes the starboard message.
     *
     * @param channelID The ID of the channel.
     * @param messageID The ID of the message.
     */
    async delete(channelID: string, messageID: string): Promise<void> {
        await this.#prisma.starboardMessage.delete({
            where: {
                channelID_messageID: {
                    channelID,
                    messageID
                }
            }
        });
    }

    /**
     * Retrieves the starboard message for the specified message.
     *
     * @param channelID The ID of the channel.
     * @param messageID The ID of the message.
     * @returns The starboard message, or null if it was not found.
     */
    async get(channelID: string, messageID: string): Promise<StarboardMessage | null> {
        return this.#prisma.starboardMessage.findUnique({
            where: {
                channelID_messageID: {
                    channelID,
                    messageID
                }
            }
        });
    }

    /**
     * Updates the ID of the crosspost message.
     *
     * @param channelID The ID of the channel.
     * @param messageID The ID of the message.
     * @param crosspostID The ID of the crosspost message.
     */
    async setCrosspostID(channelID: string, messageID: string, crosspostID: string): Promise<void> {
        await this.#prisma.starboardMessage.update({
            where: {
                channelID_messageID: {
                    channelID,
                    messageID
                }
            },
            data: { crosspostID }
        });
    }
}
