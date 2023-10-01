import { CaseNoteRepository } from "../../../../src/modules/moderation/database/index.js";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../mocks/index.js";

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
