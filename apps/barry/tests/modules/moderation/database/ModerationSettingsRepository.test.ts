import type { ModerationSettings } from "@prisma/client";
import { ModerationSettingsRepository } from "../../../../src/modules/moderation/database/index.js";
import { prisma } from "../../../mocks/index.js";

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
