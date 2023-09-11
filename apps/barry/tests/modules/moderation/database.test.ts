import {
    type Case,
    type CaseNote,
    type ModerationSettings,
    type TempBan,
    CaseType,
    Prisma
} from "@prisma/client";
import {
    CaseNoteRepository,
    CaseRepository,
    ModerationSettingsRepository,
    TempBanRepository
} from "../../../src/modules/moderation/database.js";
import { prisma } from "../../mocks/index.js";

describe("CaseRepository", () => {
    const creatorID = "257522665441460225";
    const guildID = "68239102456844360";
    const userID = "257522665437265920";

    let repository: CaseRepository;

    beforeEach(() => {
        repository = new CaseRepository(prisma);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("create", () => {
        it("should create a new case record", async () => {
            vi.spyOn(repository, "nextInSequence").mockResolvedValue(1);

            await repository.create({
                creatorID: creatorID,
                guildID: guildID,
                note: "Rude!",
                type: CaseType.Ban,
                userID: userID
            });

            expect(prisma.case.create).toHaveBeenCalledOnce();
            expect(prisma.case.create).toHaveBeenCalledWith({
                data: {
                    creatorID: creatorID,
                    guildID: guildID,
                    id: 1,
                    notes: {
                        create: {
                            content: "Rude!",
                            creatorID: creatorID,
                            id: 1
                        }
                    },
                    type: CaseType.Ban,
                    userID: userID
                }
            });
        });
    });

    describe("delete", () => {
        it("should delete the specified case record", async () => {
            await repository.delete(guildID, 1);

            expect(prisma.case.delete).toHaveBeenCalledOnce();
            expect(prisma.case.delete).toHaveBeenCalledWith({
                where: {
                    guildID_id: {
                        guildID: guildID,
                        id: 1
                    }
                }
            });
        });
    });

    describe("get", () => {
        let mockCase: Case & { notes?: CaseNote[] };

        beforeEach(() => {
            mockCase = {
                createdAt: new Date("01-01-2023"),
                creatorID: creatorID,
                guildID: guildID,
                id: 1,
                type: CaseType.Ban,
                userID: userID
            };
        });

        it("should retrieve the specified case record", async () => {
            vi.mocked(prisma.case.findUnique).mockResolvedValue(mockCase);

            const entity = await repository.get(guildID, 1);

            expect(entity).toEqual(mockCase);
            expect(prisma.case.findUnique).toHaveBeenCalledOnce();
            expect(prisma.case.findUnique).toHaveBeenCalledWith({
                include: {},
                where: {
                    guildID_id: {
                        guildID: guildID,
                        id: 1
                    }
                }
            });
        });

        it("should include the notes if specified", async () => {
            mockCase.notes = [{
                caseID: 1,
                content: "Rude!",
                createdAt: new Date("01-01-2023"),
                creatorID: creatorID,
                guildID: guildID,
                id: 1
            }];
            vi.mocked(prisma.case.findUnique).mockResolvedValue(mockCase);

            const entity = await repository.get(guildID, 1, true);

            expect(entity).toEqual(mockCase);
            expect(prisma.case.findUnique).toHaveBeenCalledOnce();
            expect(prisma.case.findUnique).toHaveBeenCalledWith({
                include: {
                    notes: {
                        orderBy: { createdAt: "desc" }
                    }
                },
                where: {
                    guildID_id: {
                        guildID: guildID,
                        id: 1
                    }
                }
            });
        });

        it("should return null if the case record does not exist", async () => {
            vi.mocked(prisma.case.findUnique).mockResolvedValue(null);

            const entity = await repository.get(guildID, 1);

            expect(entity).toEqual(null);
        });
    });

    describe("getAll", () => {
        let mockCases: Case[];

        beforeEach(() => {
            mockCases = [{
                createdAt: new Date("01-01-2023"),
                creatorID: creatorID,
                guildID: guildID,
                id: 1,
                type: CaseType.Ban,
                userID: userID
            }, {
                createdAt: new Date("01-01-2023"),
                creatorID: creatorID,
                guildID: guildID,
                id: 2,
                type: CaseType.Ban,
                userID: userID
            }];
        });

        it("should return all cases for the specified guild", async () => {
            vi.mocked(prisma.case.findMany).mockResolvedValue(mockCases);

            const entities = await repository.getAll(guildID);

            expect(entities).toEqual(mockCases);
            expect(prisma.case.findMany).toHaveBeenCalledOnce();
            expect(prisma.case.findMany).toHaveBeenCalledWith({
                orderBy: { createdAt: "desc" },
                where: { guildID }
            });
        });

        it("should return all cases for the specified guild and type", async () => {
            vi.mocked(prisma.case.findMany).mockResolvedValue(mockCases);

            const entities = await repository.getAll(guildID, CaseType.Ban);

            expect(entities).toEqual(mockCases);
            expect(prisma.case.findMany).toHaveBeenCalledOnce();
            expect(prisma.case.findMany).toHaveBeenCalledWith({
                orderBy: { createdAt: "desc" },
                where: {
                    guildID: guildID,
                    type: CaseType.Ban
                }
            });
        });

        it("should return an empty array if no cases exist for the specified guild", async () => {
            vi.mocked(prisma.case.findMany).mockResolvedValue([]);

            const entities = await repository.getAll(guildID, CaseType.Ban);

            expect(entities).toEqual([]);
        });
    });

    describe("getByUser", () => {
        let mockCases: Case[];

        beforeEach(() => {
            mockCases = [{
                createdAt: new Date("01-01-2023"),
                creatorID: creatorID,
                guildID: guildID,
                id: 1,
                type: CaseType.Ban,
                userID: userID
            }, {
                createdAt: new Date("01-01-2023"),
                creatorID: creatorID,
                guildID: guildID,
                id: 2,
                type: CaseType.Ban,
                userID: userID
            }];
        });

        it("should return all cases for the specified user", async () => {
            vi.mocked(prisma.case.findMany).mockResolvedValue(mockCases);

            const entities = await repository.getByUser(guildID, userID);

            expect(entities).toEqual(mockCases);
            expect(prisma.case.findMany).toHaveBeenCalledOnce();
            expect(prisma.case.findMany).toHaveBeenCalledWith({
                orderBy: { createdAt: "desc" },
                where: { guildID, userID }
            });
        });

        it("should return all cases for the specified user and type", async () => {
            vi.mocked(prisma.case.findMany).mockResolvedValue(mockCases);

            const entities = await repository.getByUser(guildID, userID, CaseType.Ban);

            expect(entities).toEqual(mockCases);
            expect(prisma.case.findMany).toHaveBeenCalledOnce();
            expect(prisma.case.findMany).toHaveBeenCalledWith({
                orderBy: { createdAt: "desc" },
                where: {
                    guildID: guildID,
                    type: CaseType.Ban,
                    userID: userID
                }
            });
        });

        it("should return an empty array if no cases exist for the specified user", async () => {
            vi.mocked(prisma.case.findMany).mockResolvedValue([]);

            const entities = await repository.getByUser(guildID, userID, CaseType.Ban);

            expect(entities).toEqual([]);
        });
    });

    describe("nextInSequence", () => {
        it("should return the next case ID in the sequence for the specified guild", async () => {
            vi.mocked(prisma.case.aggregate).mockResolvedValue({
                _max: { id: 1 }
            } as Prisma.GetCaseAggregateType<Prisma.CaseAggregateArgs>);

            const id = await repository.nextInSequence(guildID);

            expect(id).toEqual(2);
            expect(prisma.case.aggregate).toHaveBeenCalledOnce();
            expect(prisma.case.aggregate).toHaveBeenCalledWith({
                where: { guildID },
                _max: { id: true }
            });
        });

        it("should return 1 if no cases exist for the specified guild", async () => {
            vi.mocked(prisma.case.aggregate).mockResolvedValue({
                _max: { id: null }
            } as Prisma.GetCaseAggregateType<Prisma.CaseAggregateArgs>);

            const id = await repository.nextInSequence(guildID);

            expect(id).toEqual(1);
            expect(prisma.case.aggregate).toHaveBeenCalledOnce();
            expect(prisma.case.aggregate).toHaveBeenCalledWith({
                where: { guildID },
                _max: { id: true }
            });
        });
    });

    describe("update", () => {
        it("should update the specified case record", async () => {
            await repository.update(guildID, 1, {
                type: CaseType.Ban
            });

            expect(prisma.case.update).toHaveBeenCalledOnce();
            expect(prisma.case.update).toHaveBeenCalledWith({
                data: {
                    type: CaseType.Ban
                },
                where: {
                    guildID_id: {
                        guildID: guildID,
                        id: 1
                    }
                }
            });
        });
    });
});

describe("CaseNoteRepository", () => {
    const guildID = "68239102456844360";
    let repository: CaseNoteRepository;

    beforeEach(() => {
        repository = new CaseNoteRepository(prisma);
    });

    describe("create", () => {
        it("should create a new case note record", async () => {
            vi.spyOn(repository, "nextInSequence").mockResolvedValue(1);

            await repository.create({
                caseID: 1,
                content: "Rude!",
                creatorID: "257522665441460225",
                guildID: guildID
            });

            expect(prisma.caseNote.create).toHaveBeenCalledOnce();
            expect(prisma.caseNote.create).toHaveBeenCalledWith({
                data: {
                    caseID: 1,
                    content: "Rude!",
                    creatorID: "257522665441460225",
                    guildID: guildID,
                    id: 1
                }
            });
        });
    });

    describe("delete", () => {
        it("should delete the specified case note record", async () => {
            await repository.delete(guildID, 1, 1);

            expect(prisma.caseNote.delete).toHaveBeenCalledOnce();
            expect(prisma.caseNote.delete).toHaveBeenCalledWith({
                where: {
                    guildID_caseID_id: {
                        caseID: 1,
                        guildID: guildID,
                        id: 1
                    }
                }
            });
        });
    });

    describe("nextInSequence", () => {
        it("should return the next note ID in the sequence for the specified case", async () => {
            vi.mocked(prisma.caseNote.aggregate).mockResolvedValue({
                _max: { id: 1 }
            } as Prisma.GetCaseAggregateType<Prisma.CaseAggregateArgs>);

            const id = await repository.nextInSequence(guildID, 1);

            expect(id).toEqual(2);
            expect(prisma.caseNote.aggregate).toHaveBeenCalledOnce();
            expect(prisma.caseNote.aggregate).toHaveBeenCalledWith({
                where: {
                    caseID: 1,
                    guildID: guildID
                },
                _max: { id: true }
            });
        });

        it("should return 1 if no notes exist for the specified case", async () => {
            vi.mocked(prisma.caseNote.aggregate).mockResolvedValue({
                _max: { id: null }
            } as Prisma.GetCaseAggregateType<Prisma.CaseAggregateArgs>);

            const id = await repository.nextInSequence(guildID, 1);

            expect(id).toEqual(1);
            expect(prisma.caseNote.aggregate).toHaveBeenCalledOnce();
            expect(prisma.caseNote.aggregate).toHaveBeenCalledWith({
                where: {
                    caseID: 1,
                    guildID: guildID
                },
                _max: { id: true }
            });
        });
    });

    describe("update", () => {
        it("should update the specified case note record", async () => {
            await repository.update(guildID, 1, 1, {
                content: "Really rude!"
            });

            expect(prisma.caseNote.update).toHaveBeenCalledOnce();
            expect(prisma.caseNote.update).toHaveBeenCalledWith({
                data: {
                    content: "Really rude!"
                },
                where: {
                    guildID_caseID_id: {
                        caseID: 1,
                        guildID: guildID,
                        id: 1
                    }
                }
            });
        });
    });
});

describe("ModerationSettingsRepository", () => {
    const guildID = "68239102456844360";

    let repository: ModerationSettingsRepository;
    let mockSettings: ModerationSettings;

    beforeEach(() => {
        repository = new ModerationSettingsRepository(prisma);
        mockSettings = {
            channelID: "30527482987641765",
            dwcDays: 7,
            dwcRoleID: null,
            enabled: true,
            guildID: guildID
        };
    });

    describe("getOrCreate", () => {
        it("should return the moderation settings for the specified guild", async () => {
            vi.mocked(prisma.moderationSettings.upsert).mockResolvedValue(mockSettings);

            const settings = await repository.getOrCreate(guildID);

            expect(settings).toEqual(mockSettings);
            expect(prisma.moderationSettings.upsert).toHaveBeenCalledOnce();
            expect(prisma.moderationSettings.upsert).toHaveBeenCalledWith({
                create: { guildID },
                update: {},
                where: { guildID }
            });
        });
    });

    describe("upsert", () => {
        it("should upsert the moderation settings for the specified guild", async () => {
            await repository.upsert(guildID, {
                channelID: "30527482987641765"
            });

            expect(prisma.moderationSettings.upsert).toHaveBeenCalledOnce();
            expect(prisma.moderationSettings.upsert).toHaveBeenCalledWith({
                create: {
                    channelID: "30527482987641765",
                    guildID: guildID
                },
                update: {
                    channelID: "30527482987641765"
                },
                where: { guildID }
            });
        });
    });
});

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
