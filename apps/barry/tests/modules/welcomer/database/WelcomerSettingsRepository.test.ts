import type { WelcomerSettings } from "@prisma/client";

import { WelcomerSettingsRepository } from "../../../../src/modules/welcomer/database/index.js";
import { prisma } from "../../../mocks/index.js";

describe("WelcomerSettingsRepository", () => {
    let repository: WelcomerSettingsRepository;
    let settings: WelcomerSettings;

    beforeAll(() => {
        repository = new WelcomerSettingsRepository(prisma);
        settings = {
            channelID: "30527482987641765",
            content: "Welcome {user} to {guild}!",
            embedAuthor: null,
            embedAuthorIcon: null,
            embedColor: null,
            embedDescription: null,
            embedFooter: null,
            embedFooterIcon: null,
            embedImage: null,
            embedThumbnail: null,
            embedTimestamp: false,
            embedTitle: null,
            enabled: true,
            guildID: "68239102456844360",
            withImage: false
        };
    });

    describe("getOrCreate", () => {
        it("should return the welcomer settings for a guild", async () => {
            vi.mocked(prisma.welcomerSettings.upsert).mockResolvedValue(settings);

            const entity = await repository.getOrCreate(settings.guildID);

            expect(entity).toEqual(settings);
            expect(prisma.welcomerSettings.upsert).toHaveBeenCalledOnce();
            expect(prisma.welcomerSettings.upsert).toHaveBeenCalledWith({
                create: { guildID: settings.guildID },
                update: {},
                where: { guildID: settings.guildID }
            });
        });
    });

    describe("upsert", () => {
        it("should upsert the provided welcomer settings record", async () => {
            await repository.upsert(settings.guildID, {
                channelID: "91256340920236565"
            });

            expect(prisma.welcomerSettings.upsert).toHaveBeenCalledOnce();
            expect(prisma.welcomerSettings.upsert).toHaveBeenCalledWith({
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
