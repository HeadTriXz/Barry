import { type Report, ReportCategory, ReportType } from "@prisma/client";

import { ReportRepository } from "../../../../../src/modules/marketplace/dependencies/reports/database/index.js";
import { prisma } from "../../../../mocks/prisma.js";

describe("ReportRepository", () => {
    const guildID = "68239102456844360";
    const creatorID = "68239102456844360";
    const userID = "68239102456844360";

    let repository: ReportRepository;
    let report: Report;

    beforeEach(() => {
        repository = new ReportRepository(prisma);
        report = {
            category: ReportCategory.ScamsFraud,
            createdAt: new Date(),
            creatorID: creatorID,
            guildID: guildID,
            id: 42,
            reason: "They scammed me.",
            requestID: 1,
            type: ReportType.Request,
            userID: userID
        };
    });

    describe("create", () => {
        it("should create a new report", async () => {
            await repository.create({
                category: ReportCategory.ScamsFraud,
                creatorID: creatorID,
                guildID: guildID,
                reason: "They scammed me.",
                type: ReportType.Profile,
                userID: userID
            });

            expect(prisma.report.create).toHaveBeenCalledOnce();
            expect(prisma.report.create).toHaveBeenCalledWith({
                data: {
                    category: ReportCategory.ScamsFraud,
                    creatorID: creatorID,
                    guildID: guildID,
                    reason: "They scammed me.",
                    type: ReportType.Profile,
                    userID: userID
                }
            });
        });
    });

    describe("get", () => {
        it("should return a report by its ID", async () => {
            vi.mocked(prisma.report.findUnique).mockResolvedValue(report);

            const entity = await repository.get(42);

            expect(entity).toEqual(report);
            expect(prisma.report.findUnique).toHaveBeenCalledOnce();
            expect(prisma.report.findUnique).toHaveBeenCalledWith({
                where: { id: 42 }
            });
        });

        it("should return null if the report was not found", async () => {
            vi.mocked(prisma.report.findUnique).mockResolvedValue(null);

            const entity = await repository.get(42);

            expect(entity).toBeNull();
            expect(prisma.report.findUnique).toHaveBeenCalledOnce();
            expect(prisma.report.findUnique).toHaveBeenCalledWith({
                where: { id: 42 }
            });
        });
    });
});
