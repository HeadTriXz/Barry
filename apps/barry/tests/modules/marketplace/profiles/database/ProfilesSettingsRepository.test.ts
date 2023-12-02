import type { ProfilesSettings } from "@prisma/client";

import { ProfilesSettingsRepository } from "../../../../../src/modules/marketplace/dependencies/profiles/database/index.js";
import { mockChannel } from "@barry-bot/testing";
import { prisma } from "../../../../mocks/index.js";

describe("ProfilesSettingsRepository", () => {
    const guildID = "68239102456844360";

    let repository: ProfilesSettingsRepository;
    let settings: ProfilesSettings;

    beforeEach(() => {
        repository = new ProfilesSettingsRepository(prisma);
        settings = {
            channelID: mockChannel.id,
            enabled: true,
            guildID: guildID,
            lastMessageID: null
        };
    });

    describe("getOrCreate", () => {
        it("should return the requests settings for a guild", async () => {
            vi.mocked(prisma.profilesSettings.upsert).mockResolvedValue(settings);

            const entity = await repository.getOrCreate(guildID);

            expect(entity).toEqual(settings);
            expect(prisma.profilesSettings.upsert).toHaveBeenCalledOnce();
            expect(prisma.profilesSettings.upsert).toHaveBeenCalledWith({
                create: { guildID },
                update: {},
                where: { guildID }
            });
        });
    });

    describe("upsert", () => {
        it("should upsert the provided profiles settings record", async () => {
            await repository.upsert(guildID, {
                lastMessageID: "91256340920236565"
            });

            expect(prisma.profilesSettings.upsert).toHaveBeenCalledOnce();
            expect(prisma.profilesSettings.upsert).toHaveBeenCalledWith({
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
