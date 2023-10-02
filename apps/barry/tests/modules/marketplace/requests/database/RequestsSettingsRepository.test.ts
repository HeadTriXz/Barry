import type { RequestsSettings } from "@prisma/client";

import { RequestsSettingsRepository } from "../../../../../src/modules/marketplace/dependencies/requests/database/index.js";
import { mockChannel } from "@barry/testing";
import { prisma } from "../../../../mocks/index.js";

describe("RequestsSettingsRepository", () => {
    const guildID = "68239102456844360";

    let repository: RequestsSettingsRepository;
    let settings: RequestsSettings;

    beforeEach(() => {
        repository = new RequestsSettingsRepository(prisma);
        settings = {
            channelID: mockChannel.id,
            enabled: true,
            guildID: guildID,
            lastMessageID: null,
            minCompensation: 50
        };
    });

    describe("getOrCreate", () => {
        it("should return the requests settings for a guild", async () => {
            vi.mocked(prisma.requestsSettings.upsert).mockResolvedValue(settings);

            const entity = await repository.getOrCreate(guildID);

            expect(entity).toEqual(settings);
            expect(prisma.requestsSettings.upsert).toHaveBeenCalledOnce();
            expect(prisma.requestsSettings.upsert).toHaveBeenCalledWith({
                create: { guildID },
                update: {},
                where: { guildID }
            });
        });
    });

    describe("upsert", () => {
        it("should upsert the provided requests settings record", async () => {
            await repository.upsert(guildID, {
                lastMessageID: "91256340920236565"
            });

            expect(prisma.requestsSettings.upsert).toHaveBeenCalledOnce();
            expect(prisma.requestsSettings.upsert).toHaveBeenCalledWith({
                create: {
                    guildID: guildID,
                    lastMessageID: "91256340920236565"
                },
                update: {
                    lastMessageID: "91256340920236565"
                },
                where: { guildID }
            });
        });
    });
});
