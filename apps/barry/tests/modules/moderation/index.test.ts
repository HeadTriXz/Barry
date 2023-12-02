import type { APIGuildMember, APIUser } from "@discordjs/core";
import {
    type ExpiredDWCScheduledBan,
    CaseNoteRepository,
    CaseRepository,
    DWCScheduledBanRepository,
    ModerationSettingsRepository,
    TempBanRepository
} from "../../../src/modules/moderation/database/index.js";
import {
    type ModerationSettings,
    type ProfilesSettings,
    type RequestsSettings,
    CaseType
} from "@prisma/client";
import type { CaseLogOptions } from "../../../src/modules/moderation/functions/getLogContent.js";

import {
    mockChannel,
    mockGuild,
    mockMember,
    mockMessage,
    mockRole,
    mockUser
} from "@barry-bot/testing";
import { DiscordAPIError } from "@discordjs/rest";
import { Module } from "@barry-bot/core";
import { createMockApplication } from "../../mocks/application.js";
import { mockCase } from "./mocks/case.js";

import MarketplaceModule from "../../../src/modules/marketplace/index.js";
import ModerationModule from "../../../src/modules/moderation/index.js";
import ProfilesModule from "../../../src/modules/marketplace/dependencies/profiles/index.js";
import RequestsModule from "../../../src/modules/marketplace/dependencies/requests/index.js";
import * as content from "../../../src/modules/moderation/functions/getLogContent.js";

describe("ModerationModule", () => {
    const guildID = "68239102456844360";
    const userID = "257522665437265920";
    const reason = "The DWC role was removed manually. The user will not be banned.";

    let mockBan: ExpiredDWCScheduledBan;
    let module: ModerationModule;
    let settings: ModerationSettings;

    beforeEach(() => {
        vi.useFakeTimers().setSystemTime("01-01-2023");

        const client = createMockApplication();
        module = new ModerationModule(client);

        mockBan = {
            channel_id: mockChannel.id,
            created_at: new Date(),
            dwc_role_id: mockRole.id,
            guild_id: guildID,
            user_id: userID
        };
        settings = {
            channelID: null,
            dwcDays: 7,
            dwcRoleID: null,
            enabled: true,
            guildID: mockGuild.id
        };

        vi.spyOn(module.tempBans, "getExpired").mockResolvedValue([{
            expiresAt: new Date(),
            guildID: guildID,
            userID: userID
        }]);

        vi.spyOn(module.dwcScheduledBans, "getExpired").mockResolvedValue([mockBan]);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("constructor", () => {
        it("should set up the repositories correctly", () => {
            expect(module.caseNotes).toBeInstanceOf(CaseNoteRepository);
            expect(module.cases).toBeInstanceOf(CaseRepository);
            expect(module.dwcScheduledBans).toBeInstanceOf(DWCScheduledBanRepository);
            expect(module.settings).toBeInstanceOf(ModerationSettingsRepository);
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
                guildID: guildID,
                id: 1,
                type: CaseType.Unban,
                userID: userID
            });
            vi.spyOn(module.settings, "getOrCreate").mockResolvedValue(settings);

            settings.channelID = "30527482987641765";
        });

        it("should unban users whose temporary ban has expired", async () => {
            await module.checkExpiredBans();

            expect(module.client.api.guilds.unbanUser).toHaveBeenCalledOnce();
            expect(module.client.api.guilds.unbanUser).toHaveBeenCalledWith(guildID, userID);
            expect(module.tempBans.getExpired).toHaveBeenCalledOnce();
            expect(module.tempBans.getExpired).toHaveBeenCalledWith();
        });

        it("should delete the temporary ban from the database", async () => {
            const deleteSpy = vi.spyOn(module.tempBans, "delete");

            await module.checkExpiredBans();

            expect(deleteSpy).toHaveBeenCalledOnce();
            expect(deleteSpy).toHaveBeenCalledWith(guildID, userID);
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
                guildID: guildID,
                note: "Temporary ban expired.",
                type: CaseType.Unban,
                userID: userID
            });
        });
    });

    describe("checkScheduledBans", () => {
        let creator: APIUser;
        let member: APIGuildMember;

        beforeEach(() => {
            module.createLogMessage = vi.fn();
            module.punishFlaggedUser = vi.fn();
            module.unflagUser = vi.fn();

            creator = { ...mockUser, id: module.client.applicationID };
            member = { ...mockMember, roles: [mockRole.id] };

            vi.spyOn(module.client.api.guilds, "banUser").mockResolvedValue();
            vi.spyOn(module.client.api.guilds, "getMember").mockResolvedValue(member);
            vi.spyOn(module.client.api.users, "get")
                .mockResolvedValueOnce(creator)
                .mockResolvedValue(mockUser);

            vi.spyOn(module.cases, "create").mockResolvedValue({
                createdAt: new Date(),
                creatorID: module.client.applicationID,
                guildID: guildID,
                id: 1,
                type: CaseType.Ban,
                userID: userID
            });
            vi.spyOn(module.settings, "getOrCreate").mockResolvedValue(settings);

            settings.channelID = "30527482987641765";
        });

        it("should ban users whose scheduled ban has expired", async () => {
            await module.checkScheduledBans();

            expect(module.punishFlaggedUser).toHaveBeenCalledOnce();
            expect(module.punishFlaggedUser).toHaveBeenCalledWith(creator, member.user, mockBan);
            expect(module.dwcScheduledBans.getExpired).toHaveBeenCalledOnce();
            expect(module.dwcScheduledBans.getExpired).toHaveBeenCalledWith();
        });

        it("should unflag the user if the guild has not configured the DWC role", async () => {
            mockBan.dwc_role_id = null;

            await module.checkScheduledBans();

            expect(module.unflagUser).toHaveBeenCalledOnce();
            expect(module.unflagUser).toHaveBeenCalledWith({
                channelID: mockBan.channel_id,
                creator: creator,
                guildID: mockBan.guild_id,
                reason: reason,
                user: mockUser
            });
        });

        it("should unflag the user if the role has been manually removed", async () => {
            vi.mocked(module.client.api.guilds.getMember).mockResolvedValue({ ...mockMember, roles: [] });

            await module.checkScheduledBans();

            expect(module.unflagUser).toHaveBeenCalledOnce();
            expect(module.unflagUser).toHaveBeenCalledWith({
                channelID: mockBan.channel_id,
                creator: creator,
                guildID: mockBan.guild_id,
                reason: reason,
                user: mockUser
            });
        });

        it("should punish the user if the user not being in the guild", async () => {
            const response = {
                code: 10007,
                message: "Unknown Member"
            };

            const error = new DiscordAPIError(response, 10007, 404, "PUT", "", {});
            vi.mocked(module.client.api.guilds.getMember).mockRejectedValue(error);

            await module.checkScheduledBans();

            expect(module.punishFlaggedUser).toHaveBeenCalledOnce();
            expect(module.punishFlaggedUser).toHaveBeenCalledWith(creator, mockUser, mockBan);
        });

        it("should delete the scheduled ban from the database", async () => {
            const deleteSpy = vi.spyOn(module.dwcScheduledBans, "delete");

            await module.checkScheduledBans();

            expect(deleteSpy).toHaveBeenCalledOnce();
            expect(deleteSpy).toHaveBeenCalledWith(guildID, userID);
        });

        it("should ignore if there are no expired scheduled bans", async () => {
            vi.spyOn(module.dwcScheduledBans, "getExpired").mockResolvedValue([]);

            await module.checkScheduledBans();

            expect(module.punishFlaggedUser).not.toHaveBeenCalled();
        });

        it("should throw an error if 'user' is missing on the member", async () => {
            vi.mocked(module.client.api.guilds.getMember).mockResolvedValue({ ...mockMember, user: undefined });

            await module.checkScheduledBans();

            expect(module.client.logger.error).toHaveBeenCalledOnce();
            expect(module.client.logger.error).toHaveBeenCalledWith(
                expect.objectContaining({ message: "Missing required property 'user' on member." })
            );
        });

        it("should log an error if the ban fails due to an unknown error", async () => {
            const error = new Error("Oh no!");
            vi.mocked(module.punishFlaggedUser).mockRejectedValue(error);

            await module.checkScheduledBans();

            expect(module.client.logger.error).toHaveBeenCalledOnce();
            expect(module.client.logger.error).toHaveBeenCalledWith(error);
        });
    });

    describe("createLogMessage", () => {
        const channelID = "30527482987641765";
        let options: CaseLogOptions;

        beforeEach(() => {
            vi.spyOn(content, "getLogContent").mockReturnValue({
                content: "Hello World!"
            });

            options = {
                case: mockCase,
                creator: mockUser,
                reason: "Hello World!",
                user: mockUser
            };
        });

        it("should create a new message in the configured channel", async () => {
            const createSpy = vi.spyOn(module.client.api.channels, "createMessage");

            await module.createLogMessage(channelID, options);

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

            const error = new DiscordAPIError(response, 10003, 404, "POST", "", {});
            const updateSpy = vi.spyOn(module.settings, "upsert");
            vi.spyOn(module.client.api.channels, "createMessage").mockRejectedValue(error);

            await module.createLogMessage(channelID, options);

            expect(updateSpy).toHaveBeenCalledOnce();
            expect(updateSpy).toHaveBeenCalledWith(settings.guildID, {
                channelID: null
            });
        });

        it("should log an error if the message fails due to an unknown error", async () => {
            const error = new Error("Oh no!");
            vi.spyOn(module.client.api.channels, "createMessage").mockRejectedValue(error);

            await module.createLogMessage(channelID, options);

            expect(module.client.logger.error).toHaveBeenCalledOnce();
            expect(module.client.logger.error).toHaveBeenCalledWith(error);
        });
    });

    describe("initialize", () => {
        beforeEach(() => {
            module.checkExpiredBans = vi.fn();
            module.checkScheduledBans = vi.fn();
        });

        it("should call super.initialize", async () => {
            const initSpy = vi.spyOn(Module.prototype, "initialize").mockResolvedValue();

            await module.initialize();

            expect(initSpy).toHaveBeenCalledOnce();
        });

        it("should set up the interval to check for expired bans", async () => {
            vi.useFakeTimers();
            const intervalSpy = vi.spyOn(global, "setInterval");

            await module.initialize();
            vi.advanceTimersByTime(600000);

            expect(intervalSpy).toHaveBeenCalledTimes(2);
            expect(intervalSpy).toHaveBeenCalledWith(expect.any(Function), 600000);
            expect(module.checkExpiredBans).toHaveBeenCalledOnce();
        });

        it("should set up the interval to check for expired scheduled bans", async () => {
            vi.useFakeTimers();
            const intervalSpy = vi.spyOn(global, "setInterval");

            await module.initialize();
            vi.advanceTimersByTime(600000);

            expect(intervalSpy).toHaveBeenCalledTimes(2);
            expect(intervalSpy).toHaveBeenCalledWith(expect.any(Function), 600000);
            expect(module.checkScheduledBans).toHaveBeenCalledOnce();
        });
    });

    describe("isBanned", () => {
        const guildID = "68239102456844360";
        const userID = "257522665437265920";

        it("should return true if the user is banned", async () => {
            const getSpy = vi.spyOn(module.client.api.guilds, "getMemberBan").mockResolvedValue({
                reason: "Temporary ban expired.",
                user: mockUser
            });

            const banned = await module.isBanned(guildID, userID);

            expect(getSpy).toHaveBeenCalledOnce();
            expect(getSpy).toHaveBeenCalledWith(guildID, userID);
            expect(banned).toBe(true);
        });

        it("should return false if the user is not banned", async () => {
            const response = {
                code: 10026,
                message: "Unknown Ban"
            };

            const error = new DiscordAPIError(response, 10026, 404, "GET", "", {});
            const getSpy = vi.spyOn(module.client.api.guilds, "getMemberBan").mockRejectedValue(error);

            const banned = await module.isBanned(guildID, userID);

            expect(getSpy).toHaveBeenCalledOnce();
            expect(getSpy).toHaveBeenCalledWith(guildID, userID);
            expect(banned).toBe(false);
        });
    });

    describe("isEnabled", () => {
        const guildID = "68239102456844360";

        it("should return true if the guild has the module enabled", async () => {
            const settingsSpy = vi.spyOn(module.settings, "getOrCreate").mockResolvedValue(settings);

            const enabled = await module.isEnabled(guildID);

            expect(settingsSpy).toHaveBeenCalledOnce();
            expect(settingsSpy).toHaveBeenCalledWith(guildID);
            expect(enabled).toBe(true);
        });

        it("should return false if the guild has the module disabled", async () => {
            const settingsSpy = vi.spyOn(module.settings, "getOrCreate").mockResolvedValue(settings);
            settings.enabled = false;

            const enabled = await module.isEnabled(guildID);

            expect(settingsSpy).toHaveBeenCalledOnce();
            expect(settingsSpy).toHaveBeenCalledWith(guildID);
            expect(enabled).toBe(false);
        });
    });

    describe("notifyUser", () => {
        beforeEach(() => {
            vi.useFakeTimers().setSystemTime("01-01-2023");
            vi.spyOn(module.client.api.users, "createDM").mockResolvedValue({ ...mockChannel, position: 0 });
            vi.spyOn(module.client.api.channels, "createMessage").mockResolvedValue(mockMessage);
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it("should send a message to the user", async () => {
            await module.notifyUser({
                guild: mockGuild,
                reason: "Rude!",
                type: CaseType.Warn,
                userID: mockUser.id
            });

            expect(module.client.api.users.createDM).toHaveBeenCalledOnce();
            expect(module.client.api.users.createDM).toHaveBeenCalledWith(mockUser.id);
            expect(module.client.api.channels.createMessage).toHaveBeenCalledOnce();
            expect(module.client.api.channels.createMessage).toHaveBeenCalledWith(mockChannel.id, {
                embeds: [{
                    color: expect.any(Number),
                    description: expect.stringContaining(`You have been warned in **${mockGuild.name}**`),
                    fields: [{
                        name: "**Reason**",
                        value: "Rude!"
                    }]
                }]
            });
        });

        it("should include the duration if the action is temporary", async () => {
            const expiresAt = Math.trunc((Date.now() / 1000) + 600);

            await module.notifyUser({
                duration: 600,
                guild: mockGuild,
                reason: "Rude!",
                type: CaseType.Ban,
                userID: mockUser.id
            });

            expect(module.client.api.channels.createMessage).toHaveBeenCalledOnce();
            expect(module.client.api.channels.createMessage).toHaveBeenCalledWith(mockChannel.id, {
                embeds: [{
                    color: expect.any(Number),
                    description: expect.stringContaining(`You have been banned from **${mockGuild.name}**`),
                    fields: [
                        {
                            name: "**Reason**",
                            value: "Rude!"
                        },
                        {
                            name: "**Duration**",
                            value: `Expires <t:${expiresAt}:R>`
                        }
                    ]
                }]
            });
        });

        it("should log an error if the message fails due to an unknown error", async () => {
            const error = new Error("Oh no!");
            vi.spyOn(module.client.api.channels, "createMessage").mockRejectedValue(error);

            await module.notifyUser({
                guild: mockGuild,
                reason: "Rude!",
                type: CaseType.Warn,
                userID: mockUser.id
            });

            expect(module.client.logger.error).toHaveBeenCalledOnce();
            expect(module.client.logger.error).toHaveBeenCalledWith(error);
        });

        it("should not log an error if the message fails due to the user's DMs being disabled", async () => {
            const response = {
                code: 50007,
                message: "Cannot send messages to this user"
            };

            const error = new DiscordAPIError(response, 50007, 403, "POST", "", {});
            vi.spyOn(module.client.api.channels, "createMessage").mockRejectedValue(error);

            await module.notifyUser({
                guild: mockGuild,
                reason: "Rude!",
                type: CaseType.Warn,
                userID: mockUser.id
            });

            expect(module.client.logger.error).not.toHaveBeenCalled();
        });
    });

    describe("punishFlaggedUser", () => {
        let creator: APIUser;

        beforeEach(() => {
            module.createLogMessage = vi.fn();
            module.notifyUser = vi.fn();
            module.unflagUser = vi.fn();

            creator = { ...mockUser, id: module.client.applicationID };

            vi.spyOn(module.client.api.guilds, "banUser").mockResolvedValue();
            vi.spyOn(module.client.api.guilds, "get").mockResolvedValue(mockGuild);

            vi.spyOn(module.cases, "create").mockResolvedValue({
                createdAt: new Date(),
                creatorID: module.client.applicationID,
                guildID: guildID,
                id: 1,
                type: CaseType.Ban,
                userID: userID
            });
        });

        it("should ban the user", async () => {
            await module.punishFlaggedUser(creator, mockUser, mockBan);

            expect(module.client.api.guilds.banUser).toHaveBeenCalledOnce();
            expect(module.client.api.guilds.banUser).toHaveBeenCalledWith(guildID, mockUser.id, {}, {
                reason: "User did not resolve issue."
            });
        });

        it("should create a case for the ban", async () => {
            await module.punishFlaggedUser(creator, mockUser, mockBan);

            expect(module.createLogMessage).toHaveBeenCalledOnce();
            expect(module.cases.create).toHaveBeenCalledOnce();
            expect(module.cases.create).toHaveBeenCalledWith({
                creatorID: module.client.applicationID,
                guildID: guildID,
                note: "User did not resolve issue.",
                type: CaseType.Ban,
                userID: mockUser.id
            });
        });

        it("should notify the user", async () => {
            await module.punishFlaggedUser(creator, mockUser, mockBan);

            expect(module.notifyUser).toHaveBeenCalledOnce();
            expect(module.notifyUser).toHaveBeenCalledWith({
                guild: mockGuild,
                reason: "User did not resolve issue.",
                type: CaseType.Ban,
                userID: mockUser.id
            });
        });

        it("should log the case in the configured log channel", async () => {
            await module.punishFlaggedUser(creator, mockUser, mockBan);

            expect(module.createLogMessage).toHaveBeenCalledOnce();
            expect(module.createLogMessage).toHaveBeenCalledWith(mockBan.channel_id, {
                case: expect.any(Object),
                creator: creator,
                reason: "User did not resolve issue.",
                user: mockUser
            });
        });

        it("should not log the case if the guild has not configured a log channel", async () => {
            mockBan.channel_id = null;

            await module.punishFlaggedUser(creator, mockUser, mockBan);

            expect(module.createLogMessage).not.toHaveBeenCalled();
        });
    });

    describe("unflagUser", () => {
        const channelID = "30527482987641765";

        let creator: APIUser;

        let marketplaceModule: MarketplaceModule;
        let profilesModule: ProfilesModule;
        let profilesSettings: ProfilesSettings;
        let requestsModule: RequestsModule;
        let requestsSettings: RequestsSettings;

        beforeEach(async () => {
            module.createLogMessage = vi.fn();

            marketplaceModule = new MarketplaceModule(module.client);
            profilesModule = new ProfilesModule(module.client);
            requestsModule = new RequestsModule(module.client);

            profilesModule.unflagUser = vi.fn();
            requestsModule.unflagUser = vi.fn();

            await marketplaceModule.dependencies.add(profilesModule);
            await marketplaceModule.dependencies.add(requestsModule);
            await module.client.modules.add(marketplaceModule);

            creator = { ...mockUser, id: module.client.applicationID };
            profilesSettings = {
                channelID: channelID,
                enabled: true,
                guildID: guildID,
                lastMessageID: null
            };
            requestsSettings = {
                channelID: channelID,
                enabled: true,
                guildID: guildID,
                lastMessageID: null,
                minCompensation: 50
            };

            vi.spyOn(module.cases, "create").mockResolvedValue({
                createdAt: new Date(),
                creatorID: module.client.applicationID,
                guildID: guildID,
                id: 1,
                type: CaseType.UnDWC,
                userID: userID
            });
            vi.spyOn(profilesModule.settings, "getOrCreate").mockResolvedValue(profilesSettings);
            vi.spyOn(requestsModule.settings, "getOrCreate").mockResolvedValue(requestsSettings);
        });

        it("should unflag the user's profile", async () => {
            await module.unflagUser({
                channelID: mockBan.channel_id,
                creator: creator,
                guildID: mockBan.guild_id,
                reason: reason,
                user: mockUser
            });

            expect(profilesModule.unflagUser).toHaveBeenCalledOnce();
            expect(profilesModule.unflagUser).toHaveBeenCalledWith(guildID, channelID, mockUser);
        });

        it("should unflag the user's requests", async () => {
            await module.unflagUser({
                channelID: mockBan.channel_id,
                creator: creator,
                guildID: mockBan.guild_id,
                reason: reason,
                user: mockUser
            });

            expect(requestsModule.unflagUser).toHaveBeenCalledOnce();
            expect(requestsModule.unflagUser).toHaveBeenCalledWith(guildID, channelID, mockUser);
        });

        it("should create a case for the unflag", async () => {
            await module.unflagUser({
                channelID: mockBan.channel_id,
                creator: creator,
                guildID: mockBan.guild_id,
                reason: reason,
                user: mockUser
            });

            expect(module.cases.create).toHaveBeenCalledOnce();
            expect(module.cases.create).toHaveBeenCalledWith({
                creatorID: module.client.applicationID,
                guildID: guildID,
                note: "The DWC role was removed manually. The user will not be banned.",
                type: CaseType.UnDWC,
                userID: mockUser.id
            });
        });

        it("should log the case in the configured log channel", async () => {
            await module.unflagUser({
                channelID: mockBan.channel_id,
                creator: creator,
                guildID: mockBan.guild_id,
                reason: reason,
                user: mockUser
            });

            expect(module.createLogMessage).toHaveBeenCalledOnce();
            expect(module.createLogMessage).toHaveBeenCalledWith(channelID, {
                case: expect.any(Object),
                creator: creator,
                reason: "The DWC role was removed manually. The user will not be banned.",
                user: mockUser
            });
        });

        it("should not log the case if the guild has not configured a log channel", async () => {
            mockBan.channel_id = null;

            await module.unflagUser({
                channelID: mockBan.channel_id,
                creator: creator,
                guildID: mockBan.guild_id,
                reason: reason,
                user: mockUser
            });

            expect(module.createLogMessage).not.toHaveBeenCalled();
        });

        it("should not unflag the profile if the module is not found", async () => {
            marketplaceModule.dependencies.delete(profilesModule.id);

            await module.unflagUser({
                channelID: mockBan.channel_id,
                creator: creator,
                guildID: mockBan.guild_id,
                reason: reason,
                user: mockUser
            });

            expect(profilesModule.unflagUser).not.toHaveBeenCalled();
        });

        it("should not unflag the requests if the module is not found", async () => {
            marketplaceModule.dependencies.delete(requestsModule.id);

            await module.unflagUser({
                channelID: mockBan.channel_id,
                creator: creator,
                guildID: mockBan.guild_id,
                reason: reason,
                user: mockUser
            });

            expect(requestsModule.unflagUser).not.toHaveBeenCalled();
        });

        it("should not unflag the profile if the channel is unknown", async () => {
            profilesSettings.channelID = null;

            await module.unflagUser({
                channelID: mockBan.channel_id,
                creator: creator,
                guildID: mockBan.guild_id,
                reason: reason,
                user: mockUser
            });

            expect(profilesModule.unflagUser).not.toHaveBeenCalled();
        });

        it("should not unflag the requests if the channel is unknown", async () => {
            requestsSettings.channelID = null;

            await module.unflagUser({
                channelID: mockBan.channel_id,
                creator: creator,
                guildID: mockBan.guild_id,
                reason: reason,
                user: mockUser
            });

            expect(requestsModule.unflagUser).not.toHaveBeenCalled();
        });
    });
});
