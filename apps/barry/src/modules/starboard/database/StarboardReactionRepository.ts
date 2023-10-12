import type { PrismaClient } from "@prisma/client";

/**
 * Represents a repository for managing starboard reactions.
 */
export class StarboardReactionRepository {
    /**
     * The Prisma client used to interact with the database.
     */
    #prisma: PrismaClient;

    /**
     * Represents a repository for managing starboard reactions.
     *
     * @param prisma The Prisma client used to interact with the database.
     */
    constructor(prisma: PrismaClient) {
        this.#prisma = prisma;
    }

    /**
     * Creates a new starboard reaction.
     *
     * @param options The options for creating the starboard reaction.
     * @returns The created starboard reaction.
     */
    async create(channelID: string, messageID: string, userID: string): Promise<void> {
        await this.#prisma.starboardReaction.create({
            data: {
                message: {
                    connect: {
                        channelID_messageID: {
                            channelID, messageID
                        }
                    }
                },
                userID: userID
            }
        });
    }

    /**
     * Deletes the starboard reaction.
     *
     * @param channelID The ID of the channel.
     * @param messageID The ID of the message.
     * @param userID The ID of the user.
     */
    async delete(channelID: string, messageID: string, userID: string): Promise<void> {
        await this.#prisma.starboardReaction.delete({
            where: {
                channelID_messageID_userID: {
                    channelID,
                    messageID,
                    userID
                }
            }
        });
    }

    /**
     * Deletes all starboard reactions for a message.
     *
     * @param channelID The ID of the channel.
     * @param messageID The ID of the message.
     */
    async deleteAll(channelID: string, messageID: string): Promise<void> {
        await this.#prisma.starboardReaction.deleteMany({
            where: {
                channelID,
                messageID
            }
        });
    }

    /**
     * Returns the amount of starboard reactions for a message.
     *
     * @param channelID The ID of the channel.
     * @param messageID The ID of the message.
     * @returns The amount of starboard reactions.
     */
    async getCount(channelID: string, messageID: string): Promise<number> {
        return await this.#prisma.starboardReaction.count({
            where: {
                channelID,
                messageID
            }
        });
    }

    /**
     * Checks whether a starboard reaction exists.
     *
     * @param channelID The ID of the channel.
     * @param messageID The ID of the message.
     * @param userID The ID of the user.
     * @returns Whether the starboard reaction exists.
     */
    async has(channelID: string, messageID: string, userID: string): Promise<boolean> {
        return await this.#prisma.starboardReaction.findUnique({
            where: {
                channelID_messageID_userID: {
                    channelID,
                    messageID,
                    userID
                }
            }
        }) !== null;
    }
}
