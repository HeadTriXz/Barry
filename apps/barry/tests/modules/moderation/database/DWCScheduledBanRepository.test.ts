import {
    type ExpiredDWCScheduledBan,
    DWCScheduledBanRepository
} from "../../../../src/modules/moderation/database/index.js";
import type { DWCScheduledBan } from "@prisma/client";
import { prisma } from "../../../mocks/index.js";

describe("DWCScheduledBanRepository", () => {
    const guildID = "68239102456844360";
    const userID = "257522665437265920";

    let repository: DWCScheduledBanRepository;
    let mockBan: DWCScheduledBan;

    beforeEach(() => {
        repository = new DWCScheduledBanRepository(prisma);
        mockBan = {
            createdAt: new Date(),
            guildID: guildID,
            userID: userID
        };
    });

    describe("create", () => {
        it("should create a new scheduled ban record", async () => {
            await repository.create(guildID, userID);

            expect(prisma.dWCScheduledBan.create).toHaveBeenCalledOnce();
            expect(prisma.dWCScheduledBan.create).toHaveBeenCalledWith({
                data: { guildID, userID }
            });
        });
    });

    describe("delete", () => {
        it("should delete the specified scheduled ban record", async () => {
            await repository.delete(guildID, userID);

            expect(prisma.dWCScheduledBan.delete).toHaveBeenCalledOnce();
            expect(prisma.dWCScheduledBan.delete).toHaveBeenCalledWith({
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
        it("should return the specified scheduled ban record", async () => {
            vi.mocked(prisma.dWCScheduledBan.findUnique).mockResolvedValue(mockBan);

            const entity = await repository.get(guildID, userID);

            expect(entity).toEqual(mockBan);
            expect(prisma.dWCScheduledBan.findUnique).toHaveBeenCalledOnce();
            expect(prisma.dWCScheduledBan.findUnique).toHaveBeenCalledWith({
                where: {
                    guildID_userID: {
                        guildID,
                        userID
                    }
                }
            });
        });

        it("should return null if the scheduled ban record does not exist", async () => {
            vi.mocked(prisma.dWCScheduledBan.findUnique).mockResolvedValue(null);

            const entity = await repository.get(guildID, userID);

            expect(entity).toEqual(null);
        });
    });

    describe("getExpired", () => {
        it("should return all expired scheduled ban records", async () => {
            const expiredBan: ExpiredDWCScheduledBan = {
                channel_id: null,
                created_at: new Date(),
                dwc_role_id: null,
                guild_id: guildID,
                user_id: userID
            };
            vi.mocked(prisma.$queryRaw).mockResolvedValue([expiredBan]);

            const entities = await repository.getExpired();

            expect(entities).toEqual([expiredBan]);
            expect(prisma.$queryRaw).toHaveBeenCalledOnce();
            expect(prisma.$queryRaw).toHaveBeenCalledWith([
                expect.stringContaining("WHERE d.created_at + (s.dwc_days * INTERVAL '1 day') <= NOW()")
            ]);
        });

        it("should return an empty array if no scheduled ban records are expired", async () => {
            vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

            const entities = await repository.getExpired();

            expect(entities).toEqual([]);
        });
    });
});
