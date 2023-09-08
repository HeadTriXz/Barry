import type { CaseLogOptions } from "../../../dist/modules/moderation/functions/getLogContent.js";
import type { ModerationSettings } from "@prisma/client";

import {
    CaseNoteRepository,
    CaseRepository,
    ModerationSettingsRepository
} from "../../../src/modules/moderation/database.js";
import { DiscordAPIError } from "@discordjs/rest";
import { createMockApplication } from "../../mocks/application.js";
import { mockGuild } from "@barry/testing";

import ModerationModule from "../../../src/modules/moderation/index.js";
import * as content from "../../../src/modules/moderation/functions/getLogContent.js";

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

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("constructor", () => {
        it("should set up the repositories correctly", () => {
            expect(module.caseNotes).toBeInstanceOf(CaseNoteRepository);
            expect(module.cases).toBeInstanceOf(CaseRepository);
            expect(module.moderationSettings).toBeInstanceOf(ModerationSettingsRepository);
        });
    });

    describe("createLogMessage", () => {
        const channelID = "30527482987641765";
        beforeEach(() => {
            vi.spyOn(content, "getLogContent").mockReturnValue({
                content: "Hello World!"
            });
        });

        it("should ignore if the log channel is not configured", async () => {
            await module.createLogMessage({} as CaseLogOptions, settings);

            expect(content.getLogContent).not.toHaveBeenCalled();
        });

        it("should create a new message in the configured channel", async () => {
            const createSpy = vi.spyOn(module.client.api.channels, "createMessage");
            settings.channelID = channelID;

            await module.createLogMessage({} as CaseLogOptions, settings);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith(channelID, {
                content: "Hello World!"
            });
        });

        it("should remove the configured channel if the channel does not exist", async () => {
            const response = {
                code: 10003,
                message: "Unknown channel"
            };

            settings.channelID = channelID;
            const error = new DiscordAPIError(response, 10003, 404, "POST", "", {});
            const updateSpy = vi.spyOn(module.moderationSettings, "upsert");
            vi.spyOn(module.client.api.channels, "createMessage").mockRejectedValue(error);

            await module.createLogMessage({} as CaseLogOptions, settings);

            expect(updateSpy).toHaveBeenCalledOnce();
            expect(updateSpy).toHaveBeenCalledWith(settings.guildID, {
                channelID: null
            });
        });

        it("should log an error if the message fails due to an unknown error", async () => {
            const error = new Error("Oh no!");
            vi.spyOn(module.client.api.channels, "createMessage").mockRejectedValue(error);
            settings.channelID = channelID;

            await module.createLogMessage({} as CaseLogOptions, settings);

            expect(module.client.logger.error).toHaveBeenCalledOnce();
            expect(module.client.logger.error).toHaveBeenCalledWith(error);
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
