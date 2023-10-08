import { type MemberActivity, LevelUpNotificationType } from "@prisma/client";
import type { APIChannel } from "@discordjs/core";

import {
    LevelUpSettingsRepository,
    LevelingSettingsRepository,
    MemberActivityRepository
} from "../../../src/modules/leveling/database/index.js";
import { createMockApplication } from "../../mocks/application.js";

import LevelingModule from "../../../src/modules/leveling/index.js";

describe("LevelingModule", () => {
    let member: MemberActivity;
    let module: LevelingModule;

    beforeEach(() => {
        const client = createMockApplication();
        client.api.channels.createMessage = vi.fn();

        module = new LevelingModule(client);
        member = {
            guildID: "68239102456844360",
            userID: "257522665441460225",
            messageCount: 0,
            experience: 42000,
            level: 24,
            reputation: 0,
            voiceMinutes: 0
        };
    });

    describe("constructor", () => {
        it("should set up the repositories correctly", () => {
            expect(module.levelUpSettings).toBeInstanceOf(LevelUpSettingsRepository);
            expect(module.settings).toBeInstanceOf(LevelingSettingsRepository);
            expect(module.memberActivity).toBeInstanceOf(MemberActivityRepository);
        });
    });

    describe("calculateExperience", () => {
        it("should calculate the required experience points for a given level", () => {
            expect(module.calculateExperience(1)).toBe(100);
            expect(module.calculateExperience(2)).toBe(255);
            expect(module.calculateExperience(3)).toBe(475);
            expect(module.calculateExperience(4)).toBe(770);
            expect(module.calculateExperience(5)).toBe(1150);
            expect(module.calculateExperience(25)).toBe(42000);
            expect(module.calculateExperience(75)).toBe(835375);
            expect(module.calculateExperience(100)).toBe(1899250);
        });
    });

    describe("calculateLevel", () => {
        it("should calculate the required level for a given experience points", () => {
            expect(module.calculateLevel(100)).toBe(1);
            expect(module.calculateLevel(255)).toBe(2);
            expect(module.calculateLevel(475)).toBe(3);
            expect(module.calculateLevel(770)).toBe(4);
            expect(module.calculateLevel(1150)).toBe(5);
            expect(module.calculateLevel(42000)).toBe(25);

            expect(module.calculateLevel(835374)).toBe(74);
            expect(module.calculateLevel(835375)).toBe(75);

            expect(module.calculateLevel(1899249)).toBe(99);
            expect(module.calculateLevel(1899250)).toBe(100);
        });
    });

    describe("checkLevel", () => {
        it("should update the level and notify them if they leveled up", async () => {
            module.memberActivity.upsert = vi.fn();
            module.levelUpSettings.getOrCreate = vi.fn().mockResolvedValue({
                guildID: "68239102456844360",
                message: "Hello World",
                notificationChannel: null,
                notificationType: LevelUpNotificationType.CurrentChannel
            });

            await module.checkLevel(member, "30527482987641765");

            expect(module.memberActivity.upsert).toHaveBeenCalledOnce();
            expect(module.memberActivity.upsert).toHaveBeenCalledWith("68239102456844360", "257522665441460225", {
                level: 25
            });
            expect(module.client.api.channels.createMessage).toHaveBeenCalledOnce();
            expect(module.client.api.channels.createMessage).toHaveBeenCalledWith("30527482987641765", {
                content: "Hello World"
            });
        });

        it("should do nothing if they have not leveled up", async () => {
            member.level = 25;

            module.memberActivity.upsert = vi.fn();
            module.levelUpSettings.getOrCreate = vi.fn().mockResolvedValue({
                guildID: "68239102456844360",
                message: "Hello World",
                notificationChannel: null,
                notificationType: LevelUpNotificationType.CurrentChannel
            });

            await module.checkLevel(member, "30527482987641765");

            expect(module.memberActivity.upsert).not.toHaveBeenCalled();
            expect(module.client.api.channels.createMessage).not.toHaveBeenCalled();
        });
    });

    describe("formatNumber", () => {
        it("should format numbers correctly with suffixes", () => {
            expect(module.formatNumber(1000)).toBe("1.0K");
            expect(module.formatNumber(5000000)).toBe("5.0M");
            expect(module.formatNumber(1000000000)).toBe("1.0B");
        });

        it("should pick the largest known suffix if the number is too high", () => {
            expect(module.formatNumber(1e27)).toBe("1000.0S");
            expect(module.formatNumber(4.2e30)).toBe("4200000.0S");
        });

        it("should return the number itself if it is less than 1000", () => {
            expect(module.formatNumber(999)).toBe("999");
            expect(module.formatNumber(500)).toBe("500");
            expect(module.formatNumber(1)).toBe("1");
        });
    });

    describe("isEnabled", () => {
        it("should return true if the guild has the module enabled", async () => {
            const settingsSpy = vi.spyOn(module.settings, "getOrCreate").mockResolvedValue({
                guildID: "68239102456844360",
                enabled: true,
                ignoredChannels: [],
                ignoredRoles: []
            });

            const enabled = await module.isEnabled("68239102456844360");

            expect(settingsSpy).toHaveBeenCalledOnce();
            expect(settingsSpy).toHaveBeenCalledWith("68239102456844360");
            expect(enabled).toBe(true);
        });

        it("should return false if the guild has the module disabled", async () => {
            const settingsSpy = vi.spyOn(module.settings, "getOrCreate").mockResolvedValue({
                guildID: "68239102456844360",
                enabled: false,
                ignoredChannels: [],
                ignoredRoles: []
            });

            const enabled = await module.isEnabled("68239102456844360");

            expect(settingsSpy).toHaveBeenCalledOnce();
            expect(settingsSpy).toHaveBeenCalledWith("68239102456844360");
            expect(enabled).toBe(false);
        });
    });

    describe("#notifyMember", () => {
        it("should send a notification in the configured channel if the notification type is 'CustomChannel'", async () => {
            module.memberActivity.upsert = vi.fn();
            module.levelUpSettings.getOrCreate = vi.fn().mockResolvedValue({
                guildID: "68239102456844360",
                message: "Hello World",
                notificationChannel: "48527482987641760",
                notificationType: LevelUpNotificationType.CustomChannel
            });

            await module.checkLevel(member, "30527482987641765");

            expect(module.client.api.channels.createMessage).toHaveBeenCalledOnce();
            expect(module.client.api.channels.createMessage).toHaveBeenCalledWith("48527482987641760", {
                content: "Hello World"
            });
        });

        it("should send a direct message if the notification type is 'DirectMessage'", async () => {
            const createDMSpy = vi.spyOn(module.client.api.users, "createDM").mockResolvedValue({
                id: "48527482987641760"
            } as APIChannel);

            module.memberActivity.upsert = vi.fn();
            module.levelUpSettings.getOrCreate = vi.fn().mockResolvedValue({
                guildID: "68239102456844360",
                message: "Hello World",
                notificationChannel: null,
                notificationType: LevelUpNotificationType.DirectMessage
            });

            await module.checkLevel(member, "30527482987641765");

            expect(createDMSpy).toHaveBeenCalledOnce();
            expect(createDMSpy).toHaveBeenCalledWith("257522665441460225");

            expect(module.client.api.channels.createMessage).toHaveBeenCalledOnce();
            expect(module.client.api.channels.createMessage).toHaveBeenCalledWith("48527482987641760", {
                content: "Hello World"
            });
        });
    });
});
