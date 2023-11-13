import { RewardRepository } from "../../../../../../src/modules/leveling/dependencies/rewards/database/index.js";
import { prisma } from "../../../../../mocks/index.js";

describe("RewardRepository", () => {
    const guildID = "68239102456844360";
    const roleID = "68239102456844360";
    const level = 5;

    let repository: RewardRepository;

    beforeEach(() => {
        repository = new RewardRepository(prisma);
    });

    describe("create", () => {
        it("should crete a new reward record for the specified guild", async () => {
            await repository.create(guildID, roleID, level);

            expect(prisma.reward.create).toHaveBeenCalledOnce();
            expect(prisma.reward.create).toHaveBeenCalledWith({
                data: { guildID, roleID, level }
            });
        });
    });

    describe("delete", () => {
        it("should delete the reward record with the specified ID", async () => {
            await repository.delete(420);

            expect(prisma.reward.delete).toHaveBeenCalledOnce();
            expect(prisma.reward.delete).toHaveBeenCalledWith({
                where: { id: 420 }
            });
        });
    });

    describe("getAll", () => {
        it("should retrieve all reward records for the specified guild", async () => {
            vi.mocked(prisma.reward.findMany).mockResolvedValue([]);

            const entities = await repository.getAll(guildID);

            expect(entities).toEqual([]);
            expect(prisma.reward.findMany).toHaveBeenCalledOnce();
            expect(prisma.reward.findMany).toHaveBeenCalledWith({
                where: { guildID }
            });
        });
    });

    describe("getBelow", () => {
        it("should retrieve all reward records for the specified guild and level", async () => {
            vi.mocked(prisma.reward.findMany).mockResolvedValue([]);

            const entities = await repository.getBelow(guildID, level);

            expect(entities).toEqual([]);
            expect(prisma.reward.findMany).toHaveBeenCalledOnce();
            expect(prisma.reward.findMany).toHaveBeenCalledWith({
                where: {
                    guildID: guildID,
                    level: {
                        lte: level
                    }
                }
            });
        });
    });

    describe("update", () => {
        it("should update the provided reward record", async () => {
            await repository.update(420, 69);

            expect(prisma.reward.update).toHaveBeenCalledOnce();
            expect(prisma.reward.update).toHaveBeenCalledWith({
                where: { id: 420 },
                data: { level: 69 }
            });
        });
    });
});
