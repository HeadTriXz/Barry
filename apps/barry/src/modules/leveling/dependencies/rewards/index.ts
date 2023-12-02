import type { Reward, RewardsSettings } from "@prisma/client";
import type { Application } from "../../../../Application.js";
import type { ModuleWithSettings } from "../../../../types/modules.js";
import type { UpdatableInteraction } from "@barry-bot/core";

import { ButtonStyle, ComponentType, TextInputStyle } from "@discordjs/core";
import { RewardRepository, RewardsSettingsRepository } from "./database/index.js";
import { BooleanGuildSettingOption } from "../../../../config/options/BooleanGuildSettingOption.js";
import { ConfigurableModule } from "../../../../config/module.js";
import { DiscordAPIError } from "@discordjs/rest";
import { timeoutContent } from "../../../../common.js";

import config from "../../../../config.js";

/**
 * Represents the rewards module.
 */
export default class RewardsModule extends ConfigurableModule<RewardsModule> implements ModuleWithSettings<
    RewardsSettings
> {
    /**
     * The repository for managing rewards.
     */
    rewards: RewardRepository;

    /**
     * The repository for managing the settings of this module.
     */
    settings: RewardsSettingsRepository;

    /**
     * Represents the rewards module.
     *
     * @param client The client that initialized the module.
     */
    constructor(client: Application) {
        super(client, {
            id: "rewards",
            name: "Rewards",
            description: "Reward members for engaging in the server."
        });

        this.rewards = new RewardRepository(client.prisma);
        this.settings = new RewardsSettingsRepository(client.prisma);

        this.defineCustom({
            name: "Rewards",
            description: "The available rewards for the guild.",
            onEdit: async (self, interaction) => this.handleRewards(interaction),
            onView: async (self, interaction) => {
                const rewards = await this.rewards.getAll(interaction.guildID);
                if (rewards.length === 0) {
                    return "`None`";
                }

                return rewards.map((r) => `<@&${r.roleID}>`).join(", ");
            }
        });

        this.defineConfig({
            settings: {
                enabled: new BooleanGuildSettingOption({
                    name: "Enabled",
                    description: "Whether the rewards module is enabled in the guild."
                }),
                keepRewards: new BooleanGuildSettingOption({
                    name: "Keep Rewards",
                    description: "Whether to keep rewards after a new reward is claimed."
                })
            }
        });
    }

    /**
     * Claims the rewards for the given user.
     *
     * @param guildID The ID of the guild.
     * @param userID The ID of the user.
     * @param level The level of the user.
     */
    async claimRewards(guildID: string, userID: string, level: number): Promise<void> {
        const rewards = await this.rewards.getBelow(guildID, level);
        if (rewards.length === 0) {
            return;
        }

        try {
            const member = await this.client.api.guilds.getMember(guildID, userID);
            const settings = await this.settings.getOrCreate(guildID);

            const highest = rewards.reduce((prev, curr) => (prev.level > curr.level ? prev : curr));
            const addable = settings.keepRewards
                ? rewards.filter((r) => !member.roles.includes(r.roleID))
                : rewards.filter((r) => !member.roles.includes(r.roleID) && r.level === highest.level);

            for (const reward of addable) {
                try {
                    await this.client.api.guilds.addRoleToMember(guildID, userID, reward.roleID);
                } catch (error: unknown) {
                    if (error instanceof DiscordAPIError && error.code === 10011) {
                        await this.rewards.delete(reward.id);
                    }
                }
            }

            if (!settings.keepRewards) {
                const removable = rewards.filter((r) => r.level < highest.level && member.roles.includes(r.roleID));
                for (const reward of removable) {
                    try {
                        await this.client.api.guilds.removeRoleFromMember(guildID, userID, reward.roleID);
                    } catch (error: unknown) {
                        this.client.logger.error(error);
                    }
                }
            }
        } catch (error: unknown) {
            this.client.logger.error(error);
        }
    }

    /**
     * Deletes a reward from the guild.
     *
     * @param interaction The interaction that triggered the option.
     * @param rewards The current rewards in the guild.
     */
    async deleteReward(interaction: UpdatableInteraction, rewards: Reward[]): Promise<void> {
        if (!interaction.isInvokedInGuild()) {
            return;
        }

        await interaction.editParent({
            components: [{
                components: [{
                    custom_id: "role",
                    placeholder: "Please select a role to remove.",
                    type: ComponentType.RoleSelect
                }],
                type: ComponentType.ActionRow
            }],
            content: `### ${config.emotes.add} Which role would you like to remove?`
        });

        const response = await interaction.awaitMessageComponent({
            customIDs: ["role"]
        });

        if (!response?.data.isRoleSelect()) {
            return interaction.editParent(timeoutContent);
        }

        await response.deferUpdate();

        const roleID = response.data.values[0];
        const reward = rewards.find((r) => r.roleID === roleID);
        if (reward === undefined) {
            return response.editParent({
                content: `${config.emotes.error} That role is not a reward.`
            });
        }

        await this.rewards.delete(reward.id);
    }

    /**
     * Handles the rewards setting option.
     *
     * @param interaction The interaction that triggered the option.
     */
    async handleRewards(interaction: UpdatableInteraction): Promise<void> {
        if (!interaction.isInvokedInGuild()) {
            return;
        }

        const rewards = await this.rewards.getAll(interaction.guildID);

        await interaction.editParent({
            components: [{
                components: [
                    {
                        custom_id: "manage",
                        emoji: {
                            id: config.emotes.edit.id,
                            name: config.emotes.edit.name
                        },
                        label: "Manage",
                        style: ButtonStyle.Secondary,
                        type: ComponentType.Button
                    },
                    {
                        custom_id: "delete",
                        emoji: {
                            id: config.emotes.delete.id,
                            name: config.emotes.delete.name
                        },
                        label: "Delete",
                        style: ButtonStyle.Secondary,
                        type: ComponentType.Button
                    }
                ],
                type: ComponentType.ActionRow
            }],
            content: `### ${config.emotes.add} What would you like to do?`,
            embeds: [{
                title: "Rewards",
                description: rewards.length === 0
                    ? "There are no rewards in this guild."
                    : `There are \`${rewards.length}\` rewards in this guild.\n\n`
                        + rewards.map((r) => `\`${r.level}\` - <@&${r.roleID}>`).join("\n"),
                color: config.embedColor
            }]
        });

        const response = await interaction.awaitMessageComponent({
            customIDs: ["manage", "delete"]
        });

        if (response === undefined) {
            return interaction.editParent(timeoutContent);
        }

        if (response.data.customID === "manage") {
            await this.manageReward(response, rewards);
        }

        if (response.data.customID === "delete") {
            await this.deleteReward(response, rewards);
        }
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
     * Manages a reward in the guild.
     *
     * @param interaction The interaction that triggered the option.
     * @param rewards The current rewards in the guild.
     */
    async manageReward(interaction: UpdatableInteraction, rewards: Reward[]): Promise<void> {
        if (!interaction.isInvokedInGuild()) {
            return;
        }

        await interaction.editParent({
            components: [{
                components: [{
                    custom_id: "role",
                    placeholder: "Please select the reward to add or edit.",
                    type: ComponentType.RoleSelect
                }],
                type: ComponentType.ActionRow
            }],
            content: `### ${config.emotes.add} Which role would you like to modify?`
        });

        const response = await interaction.awaitMessageComponent({
            customIDs: ["role"]
        });

        if (!response?.data.isRoleSelect()) {
            return interaction.editParent(timeoutContent);
        }

        const roleID = response.data.values[0];
        const reward = rewards.find((r) => r.roleID === roleID);

        const key = `${Date.now()}-reward-manage`;
        await response.createModal({
            components: [{
                components: [{
                    custom_id: "level",
                    label: "Level",
                    placeholder: "The level required to claim this reward.",
                    required: true,
                    style: TextInputStyle.Short,
                    type: ComponentType.TextInput,
                    value: reward?.level.toString()
                }],
                type: ComponentType.ActionRow
            }],
            custom_id: key,
            title: "Manage Reward"
        });

        const modalResponse = await response.awaitModalSubmit(key);
        if (modalResponse === undefined) {
            return response.editParent(timeoutContent);
        }

        await modalResponse.deferUpdate();

        const level = parseInt(modalResponse.values.level);
        if (isNaN(level) || level < 1) {
            return modalResponse.editParent({
                content: `${config.emotes.error} That is not a valid level.`
            });
        }

        if (reward !== undefined) {
            await this.rewards.update(reward.id, level);
        } else {
            await this.rewards.create(interaction.guildID, roleID, level);
        }
    }
}
