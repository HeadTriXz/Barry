import type { LevelingSettings } from "@prisma/client";

import { LevelingSettingsRepository } from "../../../../src/modules/leveling/database/index.js";
import { prisma } from "../../../mocks/index.js";

describe("LevelingSettingsRepository", () => {
    const guildID = "68239102456844360";

    let repository: LevelingSettingsRepository;
    let settings: LevelingSettings;

    beforeEach(() => {
        repository = new LevelingSettingsRepository(prisma);
        settings = {
            guildID: guildID,
            enabled: true,
            ignoredChannels: [],
            ignoredRoles: []
        };
    });

    describe("getOrCreate", () => {
        it("should return the leveling settings for a guild", async () => {
            vi.mocked(prisma.levelingSettings.upsert).mockResolvedValue(settings);

            const entity = await repository.getOrCreate(guildID);

            expect(entity).toEqual(settings);
            expect(prisma.levelingSettings.upsert).toHaveBeenCalledOnce();
            expect(prisma.levelingSettings.upsert).toHaveBeenCalledWith({
                create: { guildID },
                update: {},
                where: { guildID }
            });
        });
    });

    describe("upsert", () => {
        it("should upsert the provided leveling settings record", async () => {
            await repository.upsert(guildID, {
                enabled: false
            });

            expect(prisma.levelingSettings.upsert).toHaveBeenCalledOnce();
            expect(prisma.levelingSettings.upsert).toHaveBeenCalledWith({
                create: {
                    enabled: false,
                    guildID: guildID
                },
                update: { enabled: false },
                where: { guildID }
            });
        });
    });
});
