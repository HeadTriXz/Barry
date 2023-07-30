import { type MemberActivity, LevelUpNotificationType } from "@prisma/client";

import type { Application } from "../../Application.js";

import {
    LevelUpSettingsRepository,
    LevelingSettingsRepository,
    MemberActivityRepository
} from "./database.js";
import { loadCommands, loadEvents } from "../../utils/index.js";
import { Module } from "@barry/core";

/**
 * Make the selected properties of T requried.
 */
export type PickRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Represents the leveling module.
 */
export default class LevelingModule extends Module<Application> {
    /**
     * Repository class for managing level up settings.
     */
    levelUpSettings: LevelUpSettingsRepository;

    /**
     * Repository class for managing settings for this module.
     */
    levelingSettings: LevelingSettingsRepository;

    /**
     * Repository class for managing member activity records.
     */
    memberActivity: MemberActivityRepository;

    /**
     * Represents the leveling module.
     *
     * @param client The client that initialized the module.
     */
    constructor(client: Application) {
        super(client, {
            id: "leveling",
            name: "Leveling",
            description: "Tracks user activity and assigns experience and levels based on their participation in the server.",
            commands: loadCommands("./commands"),
            events: loadEvents("./events")
        });

        this.levelUpSettings = new LevelUpSettingsRepository(client.prisma);
        this.levelingSettings = new LevelingSettingsRepository(client.prisma);
        this.memberActivity = new MemberActivityRepository(client.prisma);
    }

    /**
     * Calculates the required experience for a level.
     *
     * @param level The level to calculate the required experience for.
     * @returns The required experience for the given level.
     */
    calculateExperience(level: number): number {
        return 5 / 6 * (2 * level ** 3 + 27 * level ** 2 + 91 * level);
    }

    /**
     * Calculates the level based on the given experience points.
     *
     * @param experience The experience points to calculate the level for.
     * @returns The calculated level based on the given experience points.
     */
    calculateLevel(experience: number): number {
        const a = Math.sqrt(3888 * experience ** 2 + 291600 * experience - 207025);
        const b = Math.sqrt(3) * a - 108 * experience - 4050;

        const c = 2 * 3 ** (2 / 3) * Math.cbrt(5);
        const d = 61 * Math.cbrt(5 / 3);
        const e = 2 * Math.cbrt(b);

        return Math.floor(Math.fround(Math.cbrt(-b) / c - d / e - 9 / 2));
    }

    /**
     * Checks if the user has leveled up, and updates their level if necessary.
     *
     * @param member The member activity record of the user.
     * @param channelID The ID of the channel to send the notification in.
     */
    async checkLevel(member: MemberActivity, channelID: string): Promise<void> {
        const newLevel = this.calculateLevel(member.experience);
        if (newLevel > member.level) {
            await this.memberActivity.upsert(member.guildID, member.userID, {
                level: newLevel
            });

            await this.#notifyMember(member, channelID, newLevel);
        }
    }

    /**
     * Formats a number with a suffix indicating the scale.
     *
     * @param num The number to be formatted.
     * @returns The formatted number with a suffix.
     */
    formatNumber(num: number): string {
        const units = ["", "K", "M", "B", "t", "q", "Q", "s", "S"];

        const exponent = Math.trunc(Math.log10(Math.abs(num)) / 3);
        if (exponent <= 0) {
            return num.toString();
        }

        const index = Math.min(exponent, units.length - 1);
        const fixed = (num / Math.pow(1000, index)).toFixed(1);

        return fixed + units[index];
    }

    /**
     * Checks if the guild has enabled this module.
     *
     * @param guildID The ID of the guild.
     * @returns Whether the guild has enabled this module.
     */
    async isEnabled(guildID: string): Promise<boolean> {
        const settings = await this.levelingSettings.getOrCreate(guildID);
        return settings.enabled;
    }

    /**
     * Notifies the user about their new level.
     *
     * @param member The member activity record of the user.
     * @param channelID The ID of the channel to send the notification in.
     * @param level The new level of the user.
     */
    async #notifyMember(member: MemberActivity, channelID: string, level: number): Promise<void> {
        const settings = await this.levelUpSettings.getOrCreate(member.guildID);
        const content = settings.message
            .replace("{user}", `<@${member.userID}>`)
            .replace("{level}", level.toString());

        switch (settings.notificationType) {
            case LevelUpNotificationType.CustomChannel: {
                if (settings.notificationChannel !== null) {
                    channelID = settings.notificationChannel;
                }
                break;
            }
            case LevelUpNotificationType.DirectMessage: {
                const channel = await this.client.api.users.createDM(member.userID);
                channelID = channel.id;
                break;
            }
        }

        await this.client.api.channels.createMessage(channelID, { content });
    }
}
