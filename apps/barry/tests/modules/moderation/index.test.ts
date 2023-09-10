import { type ModerationSettings, CaseType } from "@prisma/client";
import type { CaseLogOptions } from "../../../dist/modules/moderation/functions/getLogContent.js";

import {
    CaseNoteRepository,
    CaseRepository,
    ModerationSettingsRepository,
    TempBanRepository
} from "../../../src/modules/moderation/database.js";
import { mockGuild, mockUser } from "@barry/testing";
import { DiscordAPIError } from "@discordjs/rest";
import { Module } from "@barry/core";
import { createMockApplication } from "../../mocks/application.js";

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
            expect(module.tempBans).toBeInstanceOf(TempBanRepository);
        });
    });

    describe("checkExpiredBans", () => {
        beforeEach(() => {
            module.createLogMessage = vi.fn();
            vi.spyOn(module.client.api.guilds, "unbanUser").mockResolvedValue();
            vi.spyOn(module.client.api.users, "get")
                .mockResolvedValueOnce({ ...mockUser, id: module.client.applicationID })
                .mockResolvedValue(mockUser);

            vi.spyOn(module.cases, "create").mockResolvedValue({
                createdAt: new Date(),
                creatorID: module.client.applicationID,
                guildID: "68239102456844360",
                id: 1,
                type: CaseType.Unban,
                userID: "30527482987641765"
            });
            vi.spyOn(module.moderationSettings, "getOrCreate").mockResolvedValue(settings);
            vi.spyOn(module.tempBans, "getExpired").mockResolvedValue([{
                expiresAt: new Date(),
                guildID: "68239102456844360",
                userID: "30527482987641765"
            }]);

            settings.channelID = "30527482987641765";
        });

        it("should unban users whose temporary ban has expired", async () => {
            await module.checkExpiredBans();

            expect(module.client.api.guilds.unbanUser).toHaveBeenCalledOnce();
            expect(module.client.api.guilds.unbanUser).toHaveBeenCalledWith("68239102456844360", "30527482987641765");
            expect(module.tempBans.getExpired).toHaveBeenCalledOnce();
            expect(module.tempBans.getExpired).toHaveBeenCalledWith();
        });

        it("should delete the temporary ban from the database", async () => {
            const deleteSpy = vi.spyOn(module.tempBans, "delete");

            await module.checkExpiredBans();

            expect(deleteSpy).toHaveBeenCalledOnce();
            expect(deleteSpy).toHaveBeenCalledWith("68239102456844360", "30527482987641765");
        });

        it("should log an error if the unban fails due to an unknown error", async () => {
            const error = new Error("Oh no!");
            vi.spyOn(module.client.api.guilds, "unbanUser").mockRejectedValue(error);

            await module.checkExpiredBans();

            expect(module.client.logger.error).toHaveBeenCalledOnce();
            expect(module.client.logger.error).toHaveBeenCalledWith(error);
        });

        it("should not log an error if the unban fails due to the user not being banned", async () => {
            const response = {
                code: 10026,
                message: "Unknown Ban"
            };

            const error = new DiscordAPIError(response, 10026, 404, "DELETE", "", {});
            vi.spyOn(module.client.api.guilds, "unbanUser").mockRejectedValue(error);

            await module.checkExpiredBans();

            expect(module.client.logger.error).not.toHaveBeenCalled();
        });

        it("should do nothing if there are no expired bans", async () => {
            vi.spyOn(module.tempBans, "getExpired").mockResolvedValue([]);

            await module.checkExpiredBans();

            expect(module.client.api.guilds.unbanUser).not.toHaveBeenCalled();
        });

        it("should create a case for the unban", async () => {
            await module.checkExpiredBans();

            expect(module.createLogMessage).toHaveBeenCalledOnce();
            expect(module.cases.create).toHaveBeenCalledOnce();
            expect(module.cases.create).toHaveBeenCalledWith({
                creatorID: module.client.applicationID,
                guildID: "68239102456844360",
                note: "Temporary ban expired.",
                type: CaseType.Unban,
                userID: "30527482987641765"
            });
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

    describe("initialize", () => {
        it("should call super.initialize", async () => {
            const initSpy = vi.spyOn(Module.prototype, "initialize").mockResolvedValue();

            await module.initialize();

            expect(initSpy).toHaveBeenCalledOnce();
        });

        it("should set up the interval to check for expired bans", async () => {
            vi.useFakeTimers();
            const checkSpy = vi.spyOn(module, "checkExpiredBans").mockResolvedValue();
            const intervalSpy = vi.spyOn(global, "setInterval");

            await module.initialize();
            vi.advanceTimersByTime(600000);

            expect(intervalSpy).toHaveBeenCalledOnce();
            expect(intervalSpy).toHaveBeenCalledWith(expect.any(Function), 600000);
            expect(checkSpy).toHaveBeenCalledOnce();
        });
    });

    describe("isBanned", () => {
        it("should return true if the user is banned", async () => {
            const getSpy = vi.spyOn(module.client.api.guilds, "getMemberBan").mockResolvedValue({
                reason: "Temporary ban expired.",
                user: mockUser
            });

            const banned = await module.isBanned("68239102456844360", "30527482987641765");

            expect(getSpy).toHaveBeenCalledOnce();
            expect(getSpy).toHaveBeenCalledWith("68239102456844360", "30527482987641765");
            expect(banned).toBe(true);
        });

        it("should return false if the user is not banned", async () => {
            const response = {
                code: 10026,
                message: "Unknown Ban"
            };

            const error = new DiscordAPIError(response, 10026, 404, "GET", "", {});
            const getSpy = vi.spyOn(module.client.api.guilds, "getMemberBan").mockRejectedValue(error);

            const banned = await module.isBanned("68239102456844360", "30527482987641765");

            expect(getSpy).toHaveBeenCalledOnce();
            expect(getSpy).toHaveBeenCalledWith("68239102456844360", "30527482987641765");
            expect(banned).toBe(false);
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
