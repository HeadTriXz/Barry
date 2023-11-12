import type { RewardsSettings } from "@prisma/client";
import { RewardsSettingsRepository } from "../../../../../../src/modules/leveling/dependencies/rewards/database/index.js";
import { prisma } from "../../../../../mocks/index.js";

describe("RewardsSettingsRepository", () => {
    const guildID = "68239102456844360";

    let repository: RewardsSettingsRepository;
    let settings: RewardsSettings;

    beforeEach(() => {
        repository = new RewardsSettingsRepository(prisma);
        settings = {
            guildID: guildID,
            enabled: true,
            keepRewards: false
        };
    });

    describe("getOrCreate", () => {
        it("should return the rewards settings for a guild", async () => {
            vi.mocked(prisma.rewardsSettings.upsert).mockResolvedValue(settings);

            const entity = await repository.getOrCreate(guildID);

            expect(entity).toEqual(settings);
            expect(prisma.rewardsSettings.upsert).toHaveBeenCalledOnce();
            expect(prisma.rewardsSettings.upsert).toHaveBeenCalledWith({
                create: { guildID },
                update: {},
                where: { guildID }
            });
        });
    });

    describe("upsert", () => {
        it("should upsert the provided rewards settings record", async () => {
            await repository.upsert(guildID, {
                enabled: false
            });

            expect(prisma.rewardsSettings.upsert).toHaveBeenCalledOnce();
            expect(prisma.rewardsSettings.upsert).toHaveBeenCalledWith({
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
