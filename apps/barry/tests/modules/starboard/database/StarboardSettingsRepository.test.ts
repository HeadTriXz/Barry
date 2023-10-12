import type { StarboardSettings } from "@prisma/client";
import { StarboardSettingsRepository } from "../../../../src/modules/starboard/database/index.js";
import { prisma } from "../../../mocks/index.js";

describe("StarboardSettingsRepository", () => {
    let repository: StarboardSettingsRepository;
    let settings: StarboardSettings;

    beforeEach(() => {
        repository = new StarboardSettingsRepository(prisma);
        settings = {
            allowedChannels: [],
            allowedRoles: [],
            autoReactChannels: [],
            channelID: "68239102456844360",
            emojiID: null,
            emojiName: "\u2B50",
            enabled: true,
            guildID: "68239102456844360",
            ignoredChannels: [],
            ignoredRoles: [],
            threshold: 5
        };
    });

    describe("getOrCreate", () => {
        it("should return the starboard settings for a guild", async () => {
            vi.mocked(prisma.starboardSettings.upsert).mockResolvedValue(settings);

            const entity = await repository.getOrCreate(settings.guildID);

            expect(entity).toEqual(settings);
            expect(prisma.starboardSettings.upsert).toHaveBeenCalledOnce();
            expect(prisma.starboardSettings.upsert).toHaveBeenCalledWith({
                create: { guildID: settings.guildID },
                update: {},
                where: { guildID: settings.guildID }
            });
        });
    });

    describe("upsert", () => {
        it("should upsert the provided starboard settings record", async () => {
            await repository.upsert(settings.guildID, {
                channelID: "91256340920236565"
            });

            expect(prisma.starboardSettings.upsert).toHaveBeenCalledOnce();
            expect(prisma.starboardSettings.upsert).toHaveBeenCalledWith({
                create: {
                    guildID: settings.guildID,
                    channelID: "91256340920236565"
                },
                update: {
                    channelID: "91256340920236565"
                },
                where: { guildID: settings.guildID }
            });
        });
    });
});
