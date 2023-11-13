import {
    type BaseGuildSettingOptionData,
    type OptionalCallback,
    DEFAULT_CHANNEL_TYPES,
    GuildSettingType,
    TypedGuildSettingOption
} from "../option.js";
import { type GuildChannelType, ComponentType } from "@discordjs/core";
import type { GuildInteraction, UpdatableInteraction } from "@barry/core";
import type { BaseSettings } from "../../types/modules.js";
import { timeoutContent } from "../../common.js";

/**
 * Represents a channel guild setting.
 */
export interface ChannelGuildSettingOptionData<
    T extends BaseSettings,
    K extends Extract<keyof T, string>
> extends BaseGuildSettingOptionData<ChannelGuildSettingOption<T, K>> {
    /**
     * The types of channels that can be selected.
     */
    channelTypes?: GuildChannelType[];
}

/**
 * Represents a channel guild setting.
 */
export class ChannelGuildSettingOption<
    T extends BaseSettings,
    K extends Extract<keyof T, string>
> extends TypedGuildSettingOption<ChannelGuildSettingOption<T, K>, T, K> {
    /**
     * The types of channels that can be selected.
     */
    channelTypes?: GuildChannelType[];

    /**
     * Represents a channel guild setting.
     *
     * @param options The options for the setting.
     */
    constructor(options: OptionalCallback<ChannelGuildSettingOptionData<T, K>>) {
        super({
            onEdit: (self, interaction) => this.handle(interaction),
            onView: (self, interaction) => this.getValue(interaction),
            type: GuildSettingType.Channel,
            ...options
        });

        this.channelTypes = options.channelTypes;
    }

    /**
     * Retrieves the value of the setting.
     *
     * @param interaction The interaction that triggered the setting.
     * @returns The formatted string.
     */
    async getValue(interaction: GuildInteraction<UpdatableInteraction>): Promise<string> {
        const value = await this.get(interaction.guildID);
        return value !== null
            ? `<#${value}>`
            : "`None`";
    }

    /**
     * Handles the interaction for the setting.
     *
     * @param interaction The interaction that triggered the setting.
     */
    async handle(interaction: GuildInteraction<UpdatableInteraction>): Promise<void> {
        const value = await this.get(interaction.guildID);

        if (typeof value !== "string" && !(this.nullable && value === null)) {
            throw new Error(`The setting '${this.key}' is not of type 'string'.`);
        }

        await interaction.editParent({
            components: [{
                components: [{
                    channel_types: this.channelTypes ?? DEFAULT_CHANNEL_TYPES,
                    custom_id: "config-channel",
                    // @ts-expect-error discord.js is lazy
                    default_values: value !== null
                        ? [{ id: value, type: "channel" }]
                        : undefined,
                    min_values: this.nullable ? 0 : 1,
                    placeholder: this.description,
                    type: ComponentType.ChannelSelect
                }],
                type: ComponentType.ActionRow
            }],
            content: `Please select the channel you want to set as the **${this.name}**.`
        });

        const response = await interaction.awaitMessageComponent({
            customIDs: ["config-channel"]
        });

        if (!response?.data.isChannelSelect()) {
            return interaction.editParent(timeoutContent);
        }

        await response.deferUpdate();

        const channelID = response.data.values[0] || null;
        if (channelID !== value) {
            await this.set(interaction.guildID, channelID as T[K]);
        }
    }
}
