import type { MemberActivity } from "@prisma/client";

import {
    MemberActivityRepository,
    MemberActivitySortBy,
    MemberActivitySortOrder
} from "../../../../src/modules/leveling/database/index.js";
import { prisma } from "../../../mocks/index.js";

describe("MemberActivityRepository", () => {
    const guildID = "68239102456844360";
    const userID = "257522665441460225";

    let member: MemberActivity;
    let repository: MemberActivityRepository;

    beforeEach(() => {
        repository = new MemberActivityRepository(prisma);
        member = {
            guildID: guildID,
            userID: userID,
            experience: 1520,
            level: 5,
            messageCount: 75,
            reputation: 2,
            voiceMinutes: 0
        };
    });

    describe("count", () => {
        it("should return the amount of member activity records for the specified guild", async () => {
            vi.mocked(prisma.memberActivity.count).mockResolvedValue(420);

            const count = await repository.count(guildID);

            expect(count).toEqual(420);
            expect(prisma.memberActivity.count).toHaveBeenCalledOnce();
            expect(prisma.memberActivity.count).toHaveBeenCalledWith({
                where: { guildID }
            });
        });
    });

    describe("create", () => {
        it("should create a new member activity record for the specified guild", async () => {
            await repository.create(guildID, userID);

            expect(prisma.memberActivity.create).toHaveBeenCalledOnce();
            expect(prisma.memberActivity.create).toHaveBeenCalledWith({ data: { guildID, userID } });
        });
    });

    describe("get", () => {
        it("should retrieve the member activity record for the specified guild", async () => {
            vi.mocked(prisma.memberActivity.findUnique).mockResolvedValue(member);

            const entity = await repository.get(guildID, userID);

            expect(entity).toEqual(member);
            expect(prisma.memberActivity.findUnique).toHaveBeenCalledOnce();
            expect(prisma.memberActivity.findUnique).toHaveBeenCalledWith({
                where: {
                    guildID_userID: { guildID, userID }
                }
            });
        });

        it("should return null when no member activity record is found", async () => {
            vi.mocked(prisma.memberActivity.findUnique).mockResolvedValue(null);

            const entity = await repository.get(guildID, userID);

            expect(entity).toBeNull();
        });
    });

    describe("getAll", () => {
        it("should retrieve all member activity records for the specified guild", async () => {
            await repository.getAll(guildID, {
                limit: 10,
                page: 2,
                sortBy: MemberActivitySortBy.Experience,
                sortOrder: MemberActivitySortOrder.Descending
            });

            expect(prisma.memberActivity.findMany).toHaveBeenCalledOnce();
            expect(prisma.memberActivity.findMany).toHaveBeenCalledWith({
                orderBy: [{
                    [MemberActivitySortBy.Experience]: MemberActivitySortOrder.Descending
                }],
                skip: 10,
                take: 10,
                where: { guildID }
            });
        });
    });

    describe("getOrCreate", () => {
        it("should retrieve the member activity record if found", async () => {
            vi.mocked(prisma.memberActivity.findUnique).mockResolvedValue(member);

            const entity = await repository.getOrCreate(guildID, userID);

            expect(entity).toEqual(member);
            expect(prisma.memberActivity.findUnique).toHaveBeenCalledOnce();
            expect(prisma.memberActivity.create).not.toHaveBeenCalled();
        });

        it("should create a new member activity record if not found", async () => {
            vi.mocked(prisma.memberActivity.findUnique).mockResolvedValue(null);
            vi.mocked(prisma.memberActivity.create).mockResolvedValue(member);

            const entity = await repository.getOrCreate(guildID, userID);

            expect(entity).toEqual(member);
            expect(prisma.memberActivity.findUnique).toHaveBeenCalledOnce();
            expect(prisma.memberActivity.create).toHaveBeenCalledOnce();
        });
    });

    describe("increment", () => {
        it("should increment the specified properties or create a new record if it does not exist", async () => {
            await repository.increment(guildID, userID, {
                experience: 15
            });

            expect(prisma.memberActivity.upsert).toHaveBeenCalledOnce();
            expect(prisma.memberActivity.upsert).toHaveBeenCalledWith({
                create: {
                    guildID: guildID,
                    userID: userID,
                    experience: 15
                },
                update: {
                    experience: {
                        increment: 15
                    }
                },
                where: {
                    guildID_userID: { guildID, userID }
                }
            });
        });
    });

    describe("upsert", () => {
        it("should upsert the provided member activity record", async () => {
            await repository.upsert(guildID, userID, {
                level: 8
            });

            expect(prisma.memberActivity.upsert).toHaveBeenCalledOnce();
            expect(prisma.memberActivity.upsert).toHaveBeenCalledWith({
                create: {
                    guildID: guildID,
                    userID: userID,
                    level: 8
                },
                update: { level: 8 },
                where: {
                    guildID_userID: { guildID, userID }
                }
            });
        });
    });
});
