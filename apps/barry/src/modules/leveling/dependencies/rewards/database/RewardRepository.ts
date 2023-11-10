import type { PrismaClient, Reward } from "@prisma/client";

/**
 * Repository class for managing rewards.
 */
export class RewardRepository {
    /**
     * The Prisma client used to interact with the database.
     */
    #prisma: PrismaClient;

    /**
     * Repository class for managing rewards.
     *
     * @param prisma The Prisma client used to interact with the database.
     */
    constructor(prisma: PrismaClient) {
        this.#prisma = prisma;
    }

    /**
     * Creates a new reward.
     *
     * @param guildID The ID of the guild.
     * @param roleID The ID of the reward.
     * @param level The level required to claim the reward.
     * @returns The new reward.
     */
    async create(guildID: string, roleID: string, level: number): Promise<Reward> {
        return this.#prisma.reward.create({
            data: {
                guildID,
                level,
                roleID
            }
        });
    }

    /**
     * Deletes the reward with the specified ID.
     *
     * @param id The ID of the reward to delete.
     */
    async delete(id: number): Promise<void> {
        await this.#prisma.reward.delete({
            where: { id }
        });
    }

    /**
     * Retrieves all rewards above the specified level.
     *
     * @param guildID The ID of the guild.
     * @param level The level to get the rewards for.
     * @returns The rewards above the specified level.
     */
    async getAbove(guildID: string, level: number): Promise<Reward[]> {
        return this.#prisma.reward.findMany({
            where: {
                guildID: guildID,
                level: {
                    gte: level
                }
            }
        });
    }

    /**
     * Retrieves all rewards for the specified guild.
     *
     * @param guildID The ID of the guild.
     * @returns The rewards for the specified guild.
     */
    async getAll(guildID: string): Promise<Reward[]> {
        return this.#prisma.reward.findMany({
            where: { guildID }
        });
    }

    /**
     * Updates the provided reward.
     *
     * @param id The ID of the reward to update.
     * @param level The new required level for the role.
     * @returns The updated reward.
     */
    async update(id: number, level: number): Promise<Reward> {
        return this.#prisma.reward.update({
            data: { level },
            where: { id }
        });
    }
}
