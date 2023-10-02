import { type ReportOptions, getReportContent } from "../../../../src/modules/marketplace/dependencies/reports/content.js";

import {
    ReportCategory,
    ReportStatus,
    ReportType
} from "@prisma/client";
import { ReportActionButton } from "../../../../src/modules/marketplace/dependencies/reports/index.js";
import { mockUser } from "@barry/testing";

describe("getReportContent", () => {
    const creatorID = "257522665437265920";
    const guildID = "68239102456844360";
    const userID = "257522665441460225";

    let options: ReportOptions;

    beforeEach(() => {
        options = {
            acceptedReports: [],
            creator: { ...mockUser, id: creatorID },
            localReportID: 1,
            report: {
                category: ReportCategory.ScamsFraud,
                createdAt: new Date(),
                creatorID: creatorID,
                guildID: guildID,
                id: 42,
                reason: "They scammed me.",
                requestID: 1,
                type: ReportType.Request,
                userID: userID
            },
            user: mockUser
        };
    });

    it("should return the content for a report", () => {
        const content = getReportContent(options);

        expect(content).toEqual({
            components: expect.any(Array),
            content: `### A new report has been filed against <@${options.user.id}>`,
            embeds: [{
                author: {
                    name: options.user.username,
                    icon_url: expect.stringContaining(options.user.id)
                },
                color: expect.any(Number),
                description: `**Target:** <@${options.user.id}> \`${options.user.username}\`\n`
                    + `**Creator:** <@${options.creator.id}> \`${options.creator.username}\``,
                fields: [{
                    name: "**Reason**",
                    value: options.report.reason
                }],
                footer: {
                    text: `User ID: ${options.user.id}`
                },
                timestamp: options.report.createdAt.toISOString(),
                title: `Scams & Fraud | Report #${options.localReportID}`
            }]
        });
    });

    it("should include the previous reports if there are any", () => {
        options.acceptedReports = [{
            createdAt: new Date(),
            guildID: guildID,
            id: 1,
            report: options.report,
            reportID: 42,
            status: ReportStatus.Accepted,
            threadID: "91256340920236565"
        }];

        const content = getReportContent(options);

        expect(content).toEqual({
            components: expect.any(Array),
            content: `### A new report has been filed against <@${options.user.id}>`,
            embeds: [
                expect.objectContaining({
                    fields: expect.arrayContaining([{
                        name: "**Previous Reports**",
                        value: expect.stringContaining("#1 - Scams & Fraud")
                    }])
                })
            ]
        });
    });

    it("should include the 'View Profile' button if the report is for a profile", () => {
        options.report.type = ReportType.Profile;

        const content = getReportContent(options);

        expect(content).toEqual({
            components: expect.arrayContaining([
                expect.objectContaining({
                    components: expect.arrayContaining([
                        expect.objectContaining({
                            custom_id: ReportActionButton.View,
                            label: "View Profile"
                        })
                    ])
                })
            ]),
            content: expect.any(String),
            embeds: expect.any(Array)
        });
    });

    it("should include the 'View Request' button if the report is for a request", () => {
        options.report.type = ReportType.Request;

        const content = getReportContent(options);

        expect(content).toEqual({
            components: expect.arrayContaining([
                expect.objectContaining({
                    components: expect.arrayContaining([
                        expect.objectContaining({
                            custom_id: ReportActionButton.View,
                            label: "View Request"
                        })
                    ])
                })
            ]),
            content: expect.any(String),
            embeds: expect.any(Array)
        });
    });
});
