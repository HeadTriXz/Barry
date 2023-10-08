import type { TempBan } from "@prisma/client";
import { TempBanRepository } from "../../../../src/modules/moderation/database/index.js";
import { prisma } from "../../../mocks/index.js";

describe("TempBanRepository", () => {
    const guildID = "68239102456844360";
    const userID = "257522665437265920";

    let repository: TempBanRepository;
    let mockTempBan: TempBan;

    beforeEach(() => {
        vi.useFakeTimers().setSystemTime("01-01-2023");

        repository = new TempBanRepository(prisma);
        mockTempBan = {
            expiresAt: new Date(Date.now() + 604800000),
            guildID: guildID,
            userID: userID
        };
    });

    describe("create", () => {
        it("should create a new temp ban record", async () => {
            await repository.create(guildID, userID, 604800);

            expect(prisma.tempBan.create).toHaveBeenCalledOnce();
            expect(prisma.tempBan.create).toHaveBeenCalledWith({
                data: {
                    expiresAt: new Date(Date.now() + 604800000),
                    guildID: guildID,
                    userID: userID
                }
            });
        });
    });

    describe("delete", () => {
        it("should delete the specified temp ban record", async () => {
            await repository.delete(guildID, userID);

            expect(prisma.tempBan.delete).toHaveBeenCalledOnce();
            expect(prisma.tempBan.delete).toHaveBeenCalledWith({
                where: {
                    guildID_userID: {
                        guildID,
                        userID
                    }
                }
            });
        });
    });

    describe("get", () => {
        it("should return the specified temp ban record", async () => {
            vi.mocked(prisma.tempBan.findUnique).mockResolvedValue(mockTempBan);

            const entity = await repository.get(guildID, userID);

            expect(entity).toEqual(mockTempBan);
            expect(prisma.tempBan.findUnique).toHaveBeenCalledOnce();
            expect(prisma.tempBan.findUnique).toHaveBeenCalledWith({
                where: {
                    guildID_userID: {
                        guildID,
                        userID
                    }
                }
            });
        });

        it("should return null if the temp ban record does not exist", async () => {
            vi.mocked(prisma.tempBan.findUnique).mockResolvedValue(null);

            const entity = await repository.get(guildID, userID);

            expect(entity).toEqual(null);
        });
    });

    describe("getExpired", () => {
        it("should return all expired temp ban records", async () => {
            vi.mocked(prisma.tempBan.findMany).mockResolvedValue([mockTempBan]);

            const entities = await repository.getExpired();

            expect(entities).toEqual([mockTempBan]);
            expect(prisma.tempBan.findMany).toHaveBeenCalledOnce();
            expect(prisma.tempBan.findMany).toHaveBeenCalledWith({
                where: {
                    expiresAt: {
                        lte: new Date()
                    }
                }
            });
        });

        it("should return an empty array if no temp ban records are expired", async () => {
            vi.mocked(prisma.tempBan.findMany).mockResolvedValue([]);

            const entities = await repository.getExpired();

            expect(entities).toEqual([]);
        });
    });

    describe("update", () => {
        it("should update the specified temp ban record", async () => {
            await repository.update(guildID, userID, 604800);

            expect(prisma.tempBan.update).toHaveBeenCalledOnce();
            expect(prisma.tempBan.update).toHaveBeenCalledWith({
                data: {
                    expiresAt: new Date(Date.now() + 604800000)
                },
                where: {
                    guildID_userID: {
                        guildID,
                        userID
                    }
                }
            });
        });
    });
});
