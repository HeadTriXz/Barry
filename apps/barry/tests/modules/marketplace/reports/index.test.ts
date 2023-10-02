import { type ReportsSettings, ReportCategory } from "@prisma/client";

import {
    REPORT_DEFAULT_PROFILE_REASONS,
    REPORT_DEFAULT_REQUEST_REASONS
} from "../../../../src/modules/marketplace/dependencies/reports/constants.js";
import { LocalReportRepository } from "../../../../src/modules/marketplace/dependencies/reports/database/LocalReportRepository.js";
import { ReportRepository } from "../../../../src/modules/marketplace/dependencies/reports/database/ReportRepository.js";
import { ReportsSettingsRepository } from "../../../../src/modules/marketplace/dependencies/reports/database/ReportsSettingsRepository.js";
import { createMockApplication } from "../../../mocks/application.js";

import ReportsModule from "../../../../src/modules/marketplace/dependencies/reports/index.js";

describe("ReportsModule", () => {
    let module: ReportsModule;

    beforeEach(() => {
        const client = createMockApplication();
        module = new ReportsModule(client);
    });

    describe("constructor", () => {
        it("should set up the repositories correctly", () => {
            expect(module.localReports).toBeInstanceOf(LocalReportRepository);
            expect(module.reports).toBeInstanceOf(ReportRepository);
            expect(module.settings).toBeInstanceOf(ReportsSettingsRepository);
        });
    });

    describe("getCategoryFromReason", () => {
        describe("Profiles", () => {
            it("should return 'Copyright' if the reason belongs to that category", () => {
                const expected = ReportCategory.Copyright;
                const category = module.getCategoryFromReason(REPORT_DEFAULT_PROFILE_REASONS[expected][0]);

                expect(category).toBe(expected);
            });

            it("should return 'False Information' if the reason belongs to that category", () => {
                const expected = ReportCategory.FalseInformation;
                const category = module.getCategoryFromReason(REPORT_DEFAULT_PROFILE_REASONS[expected][0]);

                expect(category).toBe(expected);
            });

            it("should return 'Inappropriate' if the reason belongs to that category", () => {
                const expected = ReportCategory.Inappropriate;
                const category = module.getCategoryFromReason(REPORT_DEFAULT_PROFILE_REASONS[expected][0]);

                expect(category).toBe(expected);
            });

            it("should return 'Scams & Fraud' if the reason belongs to that category", () => {
                const expected = ReportCategory.ScamsFraud;
                const category = module.getCategoryFromReason(REPORT_DEFAULT_PROFILE_REASONS[expected][0]);

                expect(category).toBe(expected);
            });
        });

        describe("Requests", () => {
            it("should return 'False Information' if the reason belongs to that category", () => {
                const expected = ReportCategory.FalseInformation;
                const category = module.getCategoryFromReason(REPORT_DEFAULT_REQUEST_REASONS[expected][0]);

                expect(category).toBe(expected);
            });

            it("should return 'Inappropriate' if the reason belongs to that category", () => {
                const expected = ReportCategory.Inappropriate;
                const category = module.getCategoryFromReason(REPORT_DEFAULT_REQUEST_REASONS[expected][0]);

                expect(category).toBe(expected);
            });

            it("should return 'Scams & Fraud' if the reason belongs to that category", () => {
                const expected = ReportCategory.ScamsFraud;
                const category = module.getCategoryFromReason(REPORT_DEFAULT_REQUEST_REASONS[expected][0]);

                expect(category).toBe(expected);
            });
        });

        it("should return 'Other' if the reason is not found", () => {
            const category = module.getCategoryFromReason("This reason doesn't exist.");

            expect(category).toBe(ReportCategory.Other);
        });
    });

    describe("getTagFromCategory", () => {
        it("should return the 'Copyright' tag if the category is 'Copyright'", () => {
            const expected = "68239102456844360";
            const tag = module.getTagFromCategory({
                tagCopyright: expected
            } as ReportsSettings, ReportCategory.Copyright);

            expect(tag).toBe(expected);
        });

        it("should return the 'Scams & Fraud' tag if the category is 'Scams & Fraud'", () => {
            const expected = "68239102456844360";
            const tag = module.getTagFromCategory({
                tagScamsFraud: expected
            } as ReportsSettings, ReportCategory.ScamsFraud);

            expect(tag).toBe(expected);
        });

        it("should return the 'Inappropriate' tag if the category is 'Inappropriate'", () => {
            const expected = "68239102456844360";
            const tag = module.getTagFromCategory({
                tagInappropriate: expected
            } as ReportsSettings, ReportCategory.Inappropriate);

            expect(tag).toBe(expected);
        });

        it("should return the 'False Information' tag if the category is 'False Information'", () => {
            const expected = "68239102456844360";
            const tag = module.getTagFromCategory({
                tagFalseInformation: expected
            } as ReportsSettings, ReportCategory.FalseInformation);

            expect(tag).toBe(expected);
        });

        it("should return the 'Other' tag if the category is 'Other'", () => {
            const expected = "68239102456844360";
            const tag = module.getTagFromCategory({
                tagOther: expected
            } as ReportsSettings, ReportCategory.Other);

            expect(tag).toBe(expected);
        });
    });
});
