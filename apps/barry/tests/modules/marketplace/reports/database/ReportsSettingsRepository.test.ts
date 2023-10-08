import type { ReportsSettings } from "@prisma/client";

import { ReportsSettingsRepository } from "../../../../../src/modules/marketplace/dependencies/reports/database/index.js";
import { mockChannel } from "@barry/testing";
import { prisma } from "../../../../mocks/index.js";

describe("ReportsSettingsRepository", () => {
    const guildID = "68239102456844360";

    let repository: ReportsSettingsRepository;
    let settings: ReportsSettings;

    beforeEach(() => {
        repository = new ReportsSettingsRepository(prisma);
        settings = {
            channelID: mockChannel.id,
            guildID: guildID,
            tagAccepted: null,
            tagCopyright: null,
            tagFalseInformation: null,
            tagIgnored: null,
            tagInappropriate: null,
            tagOpen: null,
            tagOther: null,
            tagScamsFraud: null
        };
    });

    describe("getOrCreate", () => {
        it("should return the reports settings for a guild", async () => {
            vi.mocked(prisma.reportsSettings.upsert).mockResolvedValue(settings);

            const entity = await repository.getOrCreate(guildID);

            expect(entity).toEqual(settings);
            expect(prisma.reportsSettings.upsert).toHaveBeenCalledOnce();
            expect(prisma.reportsSettings.upsert).toHaveBeenCalledWith({
                create: { guildID },
                update: {},
                where: { guildID }
            });
        });
    });

    describe("upsert", () => {
        it("should upsert the provided reports settings record", async () => {
            await repository.upsert(guildID, {
                tagAccepted: "91256340920236565"
            });

            expect(prisma.reportsSettings.upsert).toHaveBeenCalledOnce();
            expect(prisma.reportsSettings.upsert).toHaveBeenCalledWith({
                create: {
                    guildID: guildID,
                    tagAccepted: "91256340920236565"
                },
                update: {
                    tagAccepted: "91256340920236565"
                },
                where: { guildID }
            });
        });
    });
});
