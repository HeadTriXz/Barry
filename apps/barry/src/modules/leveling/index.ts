import {
    type LevelingSettings,
    type MemberActivity,
    LevelUpNotificationType
} from "@prisma/client";
import type { Application } from "../../Application.js";
import type { Module } from "@barry/core";
import type { ModuleWithSettings } from "../../types/modules.js";

import {
    BooleanGuildSettingOption,
    ChannelArrayGuildSettingOption,
    ChannelGuildSettingOption,
    EnumGuildSettingOption,
    RoleArrayGuildSettingOption,
    StringGuildSettingOption
} from "../../config/options/index.js";
import {
    LevelUpSettingsRepository,
    LevelingSettingsRepository,
    MemberActivityRepository
} from "./database/index.js";
import { loadCommands, loadEvents, loadModules } from "../../utils/index.js";
import { ConfigurableModule } from "../../config/module.js";

/**
 * Make the selected properties of T required.
 */
export type PickRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Represents the rewards module.
 */
export interface RewardsModule extends Module {
    /**
     * Claims the rewards for the given user.
     *
     * @param guildID The ID of the guild.
     * @param userID The ID of the user.
     * @param level The level of the user.
     */
    claimRewards(guildID: string, userID: string, level: number): Promise<void>;
}

/**
 * Represents the leveling module.
 */
export default class LevelingModule extends ConfigurableModule<LevelingModule> implements ModuleWithSettings<
    LevelingSettings
> {
    /**
     * Repository class for managing level up settings.
     */
    levelUpSettings: LevelUpSettingsRepository;

    /**
     * Repository class for managing member activity records.
     */
    memberActivity: MemberActivityRepository;

    /**
     * Repository class for managing settings for this module.
     */
    settings: LevelingSettingsRepository;

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
            dependencies: loadModules("./dependencies"),
            events: loadEvents("./events")
        });

        this.levelUpSettings = new LevelUpSettingsRepository(client.prisma);
        this.memberActivity = new MemberActivityRepository(client.prisma);
        this.settings = new LevelingSettingsRepository(client.prisma);

        this.defineConfig({
            levelUpSettings: {
                message: new StringGuildSettingOption({
                    name: "Message",
                    description: "The message to send when a user levels up."
                }),
                notificationChannel: new ChannelGuildSettingOption({
                    name: "Notification Channel",
                    description: "The channel to send the notification in.",
                    nullable: true
                }),
                notificationType: new EnumGuildSettingOption({
                    name: "Notification Type",
                    description: "The type of notification to send when a user levels up.",
                    values: Object.values(LevelUpNotificationType)
                })
            },
            settings: {
                enabled: new BooleanGuildSettingOption({
                    name: "Enabled",
                    description: "Whether the leveling module is enabled in the guild."
                }),
                ignoredChannels: new ChannelArrayGuildSettingOption({
                    name: "Ignored Channels",
                    description: "Channels that are ignored when tracking user activity."
                }),
                ignoredRoles: new RoleArrayGuildSettingOption({
                    name: "Ignored Roles",
                    description: "Roles that are ignored when tracking user activity."
                })
            }
        });
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

            const rewards = this.dependencies.get<RewardsModule>("rewards");
            if (rewards !== undefined) {
                await rewards.claimRewards(member.guildID, member.userID, newLevel);
            }

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
        const settings = await this.settings.getOrCreate(guildID);
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
