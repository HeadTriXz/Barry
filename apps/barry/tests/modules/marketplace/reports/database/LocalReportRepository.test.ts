import { type LocalReport, Prisma, ReportStatus } from "@prisma/client";

import { LocalReportRepository } from "../../../../../src/modules/marketplace/dependencies/reports/database/index.js";
import { prisma } from "../../../../mocks/index.js";

describe("LocalReportRepository", () => {
    const creatorID = "257522665437265920";
    const guildID = "68239102456844360";
    const userID = "257522665441460225";

    let report: LocalReport;
    let repository: LocalReportRepository;

    beforeEach(() => {
        repository = new LocalReportRepository(prisma);
        report = {
            createdAt: new Date(),
            guildID: guildID,
            id: 1,
            reportID: 42,
            status: ReportStatus.Accepted,
            threadID: "91256340920236565"
        };
    });

    describe("create", () => {
        it("should create a new local report", async () => {
            vi.spyOn(repository, "nextInSequence").mockResolvedValue(1);

            await repository.create({
                guildID: guildID,
                reportID: 42,
                threadID: "91256340920236565"
            });

            expect(prisma.localReport.create).toHaveBeenCalledOnce();
            expect(prisma.localReport.create).toHaveBeenCalledWith({
                data: {
                    guildID: guildID,
                    id: 1,
                    reportID: 42,
                    threadID: "91256340920236565"
                }
            });
        });
    });

    describe("getAccepted", () => {
        it("should return the accepted local reports for a user", async () => {
            vi.mocked(prisma.localReport.findMany).mockResolvedValue([report]);

            const reports = await repository.getAccepted(guildID, userID);

            expect(reports).toEqual([report]);
            expect(prisma.localReport.findMany).toHaveBeenCalledOnce();
            expect(prisma.localReport.findMany).toHaveBeenCalledWith({
                include: { report: true },
                where: {
                    guildID: guildID,
                    report: { userID },
                    status: ReportStatus.Accepted
                }
            });
        });

        it("should return an empty array if no reports are found", async () => {
            vi.mocked(prisma.localReport.findMany).mockResolvedValue([]);

            const reports = await repository.getAccepted(guildID, userID);

            expect(reports).toEqual([]);
            expect(prisma.localReport.findMany).toHaveBeenCalledOnce();
            expect(prisma.localReport.findMany).toHaveBeenCalledWith({
                include: { report: true },
                where: {
                    guildID: guildID,
                    report: { userID },
                    status: ReportStatus.Accepted
                }
            });
        });
    });

    describe("getByCreator", () => {
        it("should return the local report for a creator", async () => {
            vi.mocked(prisma.localReport.findFirst).mockResolvedValue(report);

            const entity = await repository.getByCreator(creatorID, "91256340920236565");

            expect(entity).toEqual(report);
            expect(prisma.localReport.findFirst).toHaveBeenCalledOnce();
            expect(prisma.localReport.findFirst).toHaveBeenCalledWith({
                where: {
                    report: {
                        creatorID: creatorID,
                        OR: [
                            {
                                profile: {
                                    messages: {
                                        some: {
                                            messageID: "91256340920236565"
                                        }
                                    }
                                }
                            },
                            {
                                request: {
                                    messages: {
                                        some: {
                                            messageID: "91256340920236565"
                                        }
                                    }
                                }
                            }
                        ]
                    },
                    status: ReportStatus.Open
                }
            });
        });

        it("should return null if no local report is found", async () => {
            vi.mocked(prisma.localReport.findFirst).mockResolvedValue(null);

            const entity = await repository.getByCreator(creatorID, "91256340920236565");

            expect(entity).toBeNull();
            expect(prisma.localReport.findFirst).toHaveBeenCalledOnce();
            expect(prisma.localReport.findFirst).toHaveBeenCalledWith({
                where: {
                    report: {
                        creatorID: creatorID,
                        OR: [
                            {
                                profile: {
                                    messages: {
                                        some: {
                                            messageID: "91256340920236565"
                                        }
                                    }
                                }
                            },
                            {
                                request: {
                                    messages: {
                                        some: {
                                            messageID: "91256340920236565"
                                        }
                                    }
                                }
                            }
                        ]
                    },
                    status: ReportStatus.Open
                }
            });
        });
    });

    describe("getByThread", () => {
        it("should return the local report for a thread", async () => {
            vi.mocked(prisma.localReport.findFirst).mockResolvedValue(report);

            const entity = await repository.getByThread("91256340920236565");

            expect(entity).toEqual(report);
            expect(prisma.localReport.findFirst).toHaveBeenCalledOnce();
            expect(prisma.localReport.findFirst).toHaveBeenCalledWith({
                include: { report: false },
                where: { threadID: "91256340920236565" }
            });
        });

        it("should return null if no local report is found", async () => {
            vi.mocked(prisma.localReport.findFirst).mockResolvedValue(null);

            const entity = await repository.getByThread("91256340920236565");

            expect(entity).toBeNull();
            expect(prisma.localReport.findFirst).toHaveBeenCalledOnce();
            expect(prisma.localReport.findFirst).toHaveBeenCalledWith({
                include: { report: false },
                where: { threadID: "91256340920236565" }
            });
        });

        it("should return the local report with its report for a thread", async () => {
            vi.mocked(prisma.localReport.findFirst).mockResolvedValue(report);

            const entity = await repository.getByThread("91256340920236565", true);

            expect(entity).toEqual(report);
            expect(prisma.localReport.findFirst).toHaveBeenCalledOnce();
            expect(prisma.localReport.findFirst).toHaveBeenCalledWith({
                include: { report: true },
                where: { threadID: "91256340920236565" }
            });
        });
    });

    describe("nextInSequence", () => {
        it("should return the next local report ID in sequence", async () => {
            vi.mocked(prisma.localReport.aggregate).mockResolvedValue({
                _max: { id: 1 }
            } as Prisma.GetLocalReportAggregateType<Prisma.LocalReportAggregateArgs>);

            const id = await repository.nextInSequence(guildID);

            expect(id).toBe(2);
            expect(prisma.localReport.aggregate).toHaveBeenCalledOnce();
            expect(prisma.localReport.aggregate).toHaveBeenCalledWith({
                where: { guildID },
                _max: { id: true }
            });
        });

        it("should return 1 if no local reports are found", async () => {
            vi.mocked(prisma.localReport.aggregate).mockResolvedValue({
                _max: { id: null }
            } as Prisma.GetLocalReportAggregateType<Prisma.LocalReportAggregateArgs>);

            const id = await repository.nextInSequence(guildID);

            expect(id).toBe(1);
            expect(prisma.localReport.aggregate).toHaveBeenCalledOnce();
            expect(prisma.localReport.aggregate).toHaveBeenCalledWith({
                where: { guildID },
                _max: { id: true }
            });
        });
    });

    describe("update", () => {
        it("should update a local report", async () => {
            await repository.update(guildID, report.id, {
                status: ReportStatus.Ignored
            });

            expect(prisma.localReport.update).toHaveBeenCalledOnce();
            expect(prisma.localReport.update).toHaveBeenCalledWith({
                data: {
                    status: ReportStatus.Ignored
                },
                where: {
                    guildID_id: {
                        guildID: guildID,
                        id: report.id
                    }
                }
            });
        });
    });
});
