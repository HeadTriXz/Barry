import {
    type LevelUpSettings,
    LevelUpNotificationType
} from "@prisma/client";

import { LevelUpSettingsRepository } from "../../../../src/modules/leveling/database/index.js";
import { prisma } from "../../../mocks/index.js";

describe("LevelUpSettingsRepository", () => {
    const guildID = "68239102456844360";

    let repository: LevelUpSettingsRepository;
    let settings: LevelUpSettings;

    beforeEach(() => {
        repository = new LevelUpSettingsRepository(prisma);
        settings = {
            guildID: guildID,
            message: "Hello World",
            notificationChannel: null,
            notificationType: LevelUpNotificationType.CurrentChannel
        };
    });

    describe("getOrCreate", () => {
        it("should return the level up settings for a guild", async () => {
            vi.mocked(prisma.levelUpSettings.upsert).mockResolvedValue(settings);

            const entity = await repository.getOrCreate(guildID);

            expect(entity).toEqual(settings);
            expect(prisma.levelUpSettings.upsert).toHaveBeenCalledOnce();
            expect(prisma.levelUpSettings.upsert).toHaveBeenCalledWith({
                create: { guildID },
                update: {},
                where: { guildID }
            });
        });
    });

    describe("upsert", () => {
        it("should upsert the provided level up settings record", async () => {
            await repository.upsert(guildID, {
                notificationType: LevelUpNotificationType.DirectMessage
            });

            expect(prisma.levelUpSettings.upsert).toHaveBeenCalledOnce();
            expect(prisma.levelUpSettings.upsert).toHaveBeenCalledWith({
                create: {
                    guildID: guildID,
                    notificationType: LevelUpNotificationType.DirectMessage
                },
                update: {
                    notificationType: LevelUpNotificationType.DirectMessage
                },
                where: { guildID }
            });
        });
    });
});
