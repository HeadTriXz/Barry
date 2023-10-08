import {
    type Case,
    type CaseNote,
    CaseType,
    Prisma
} from "@prisma/client";
import { CaseRepository } from "../../../../src/modules/moderation/database/index.js";
import { prisma } from "../../../mocks/index.js";

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
