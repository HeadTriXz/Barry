import type { ModerationSettings } from "@prisma/client";

import {
    CaseNoteRepository,
    CaseRepository,
    ModerationSettingsRepository
} from "../../../src/modules/moderation/database.js";
import { createMockApplication } from "../../mocks/application.js";
import { mockGuild } from "@barry/testing";

import ModerationModule from "../../../src/modules/moderation/index.js";

describe("ModerationModule", () => {
    let module: ModerationModule;
    let settings: ModerationSettings;

    beforeEach(() => {
        const client = createMockApplication();
        module = new ModerationModule(client);

        settings = {
            channelID: null,
            dwcDays: 7,
            dwcRoleID: null,
            enabled: true,
            guildID: mockGuild.id
        };
    });

    describe("constructor", () => {
        it("should set up the repositories correctly", () => {
            expect(module.caseNotes).toBeInstanceOf(CaseNoteRepository);
            expect(module.cases).toBeInstanceOf(CaseRepository);
            expect(module.moderationSettings).toBeInstanceOf(ModerationSettingsRepository);
        });
    });

    describe("isEnabled", () => {
        it("should return true if the guild has the module enabled", async () => {
            const settingsSpy = vi.spyOn(module.moderationSettings, "getOrCreate").mockResolvedValue(settings);

            const enabled = await module.isEnabled("68239102456844360");

            expect(settingsSpy).toHaveBeenCalledOnce();
            expect(settingsSpy).toHaveBeenCalledWith("68239102456844360");
            expect(enabled).toBe(true);
        });

        it("should return false if the guild has the module disabled", async () => {
            const settingsSpy = vi.spyOn(module.moderationSettings, "getOrCreate").mockResolvedValue(settings);
            settings.enabled = false;

            const enabled = await module.isEnabled("68239102456844360");

            expect(settingsSpy).toHaveBeenCalledOnce();
            expect(settingsSpy).toHaveBeenCalledWith("68239102456844360");
            expect(enabled).toBe(false);
        });
    });
});
