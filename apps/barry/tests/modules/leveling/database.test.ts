import {
    type LevelingSettings,
    type LevelUpSettings,
    type MemberActivity,
    LevelUpNotificationType
} from "@prisma/client";

import {
    LevelUpSettingsRepository,
    LevelingSettingsRepository,
    MemberActivityRepository,
    MemberActivitySortBy,
    MemberActivitySortOrder
} from "../../../src/modules/leveling/database/index.js";

import { prisma } from "../../mocks/index.js";

describe("LevelUpSettingsRepository", () => {
    const guildID = "68239102456844360";

    let repository: LevelUpSettingsRepository;
    let settings: LevelUpSettings;

    beforeEach(() => {
        repository = new LevelUpSettingsRepository(prisma);
        settings = {
            guildID: guildID,
            message: "Hello World",
            notificationChannel: null,
            notificationType: LevelUpNotificationType.CurrentChannel
        };
    });

    describe("create", () => {
        it("should create a new level up settings record for the specified guild", async () => {
            await repository.create(guildID);

            expect(prisma.levelUpSettings.create).toHaveBeenCalledOnce();
            expect(prisma.levelUpSettings.create).toHaveBeenCalledWith({ data: { guildID } });
        });
    });

    describe("get", () => {
        it("should retrieve the level up settings record for the specified guild", async () => {
            vi.mocked(prisma.levelUpSettings.findUnique).mockResolvedValue(settings);

            const entity = await repository.get(guildID);

            expect(entity).toEqual(settings);
            expect(prisma.levelUpSettings.findUnique).toHaveBeenCalledOnce();
            expect(prisma.levelUpSettings.findUnique).toHaveBeenCalledWith({ where: { guildID } });
        });

        it("should return null when no level up settings record is found", async () => {
            vi.mocked(prisma.levelUpSettings.findUnique).mockResolvedValue(null);

            const entity = await repository.get(guildID);

            expect(entity).toBeNull();
        });
    });

    describe("getOrCreate", () => {
        it("should retrieve the level up settings record if found", async () => {
            vi.mocked(prisma.levelUpSettings.findUnique).mockResolvedValue(settings);

            const entity = await repository.getOrCreate(guildID);

            expect(entity).toEqual(settings);
            expect(prisma.levelUpSettings.findUnique).toHaveBeenCalledOnce();
            expect(prisma.levelUpSettings.create).not.toHaveBeenCalled();
        });

        it("should create a new level up settings record if not found", async () => {
            vi.mocked(prisma.levelUpSettings.findUnique).mockResolvedValue(null);
            vi.mocked(prisma.levelUpSettings.create).mockResolvedValue(settings);

            const entity = await repository.getOrCreate(guildID);

            expect(entity).toEqual(settings);
            expect(prisma.levelUpSettings.findUnique).toHaveBeenCalledOnce();
            expect(prisma.levelUpSettings.create).toHaveBeenCalledOnce();
        });
    });

    describe("upsert", () => {
        it("should upsert the provided level up settings record", async () => {
            await repository.upsert(guildID, {
                notificationType: LevelUpNotificationType.DirectMessage
            });

            expect(prisma.levelUpSettings.upsert).toHaveBeenCalledOnce();
            expect(prisma.levelUpSettings.upsert).toHaveBeenCalledWith({
                create: {
                    guildID: guildID,
                    notificationType: LevelUpNotificationType.DirectMessage
                },
                update: {
                    notificationType: LevelUpNotificationType.DirectMessage
                },
                where: { guildID }
            });
        });
    });
});

describe("LevelingSettingsRepository", () => {
    const guildID = "68239102456844360";

    let repository: LevelingSettingsRepository;
    let settings: LevelingSettings;

    beforeEach(() => {
        repository = new LevelingSettingsRepository(prisma);
        settings = {
            guildID: guildID,
            enabled: true,
            ignoredChannels: [],
            ignoredRoles: []
        };
    });

    describe("create", () => {
        it("should create a new leveling settings record for the specified guild", async () => {
            await repository.create(guildID);

            expect(prisma.levelingSettings.create).toHaveBeenCalledOnce();
            expect(prisma.levelingSettings.create).toHaveBeenCalledWith({ data: { guildID } });
        });
    });

    describe("get", () => {
        it("should retrieve the leveling settings record for the specified guild", async () => {
            vi.mocked(prisma.levelingSettings.findUnique).mockResolvedValue(settings);

            const entity = await repository.get(guildID);

            expect(entity).toEqual(settings);
            expect(prisma.levelingSettings.findUnique).toHaveBeenCalledOnce();
            expect(prisma.levelingSettings.findUnique).toHaveBeenCalledWith({ where: { guildID } });
        });

        it("should return null when no leveling settings record is found", async () => {
            vi.mocked(prisma.levelingSettings.findUnique).mockResolvedValue(null);

            const entity = await repository.get(guildID);

            expect(entity).toBeNull();
        });
    });

    describe("getOrCreate", () => {
        it("should retrieve the leveling settings record if found", async () => {
            vi.mocked(prisma.levelingSettings.findUnique).mockResolvedValue(settings);

            const entity = await repository.getOrCreate(guildID);

            expect(entity).toEqual(settings);
            expect(prisma.levelingSettings.findUnique).toHaveBeenCalledOnce();
            expect(prisma.levelingSettings.create).not.toHaveBeenCalled();
        });

        it("should create a new leveling settings record if not found", async () => {
            vi.mocked(prisma.levelingSettings.findUnique).mockResolvedValue(null);
            vi.mocked(prisma.levelingSettings.create).mockResolvedValue(settings);

            const entity = await repository.getOrCreate(guildID);

            expect(entity).toEqual(settings);
            expect(prisma.levelingSettings.findUnique).toHaveBeenCalledOnce();
            expect(prisma.levelingSettings.create).toHaveBeenCalledOnce();
        });
    });

    describe("upsert", () => {
        it("should upsert the provided leveling settings record", async () => {
            await repository.upsert(guildID, {
                enabled: false
            });

            expect(prisma.levelingSettings.upsert).toHaveBeenCalledOnce();
            expect(prisma.levelingSettings.upsert).toHaveBeenCalledWith({
                create: {
                    enabled: false,
                    guildID: guildID
                },
                update: { enabled: false },
                where: { guildID }
            });
        });
    });
});

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
