import {
    type GuildSettingOptionDataWithSize,
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
 * Options for a channel array guild setting.
 */
export interface ChannelArrayGuildSettingOptionData<
    T extends BaseSettings,
    K extends keyof T
> extends GuildSettingOptionDataWithSize<ChannelArrayGuildSettingOption<T, K>> {
    /**
     * The types of channels that can be selected.
     */
    channelTypes?: GuildChannelType[];
}

/**
 * Represents a channel array guild setting.
 */
export class ChannelArrayGuildSettingOption<
    T extends BaseSettings,
    K extends keyof T
> extends TypedGuildSettingOption<ChannelArrayGuildSettingOption<T, K>, T, K> {
    /**
     * The types of channels that can be selected.
     */
    channelTypes?: GuildChannelType[];

    /**
     * The maximum amount of channels that can be selected.
     */
    maximum?: number;

    /**
     * The minimum amount of channels that can be selected.
     */
    minimum?: number;

    /**
     * Represents a channel array guild setting.
     *
     * @param options The options for the setting.
     */
    constructor(options: OptionalCallback<ChannelArrayGuildSettingOptionData<T, K>>) {
        super({
            onEdit: (self, interaction) => this.handle(interaction),
            onView: (self, interaction) => this.getValue(interaction),
            type: GuildSettingType.ChannelArray,
            ...options
        });

        this.channelTypes = options.channelTypes;
        this.maximum = options.maximum;
        this.minimum = options.minimum;
    }

    /**
     * Retrieves the value of the setting.
     *
     * @param interaction The interaction that triggered the setting.
     * @returns The formatted string.
     */
    async getValue(interaction: GuildInteraction<UpdatableInteraction>): Promise<string> {
        const value = await this.store.get(interaction.guildID) as string[] | null;
        return value !== null && value.length > 0
            ? value.map((id) => `<#${id}>`).join(", ")
            : "`None`";
    }

    /**
     * Handles editing the setting.
     *
     * @param interaction The interaction that triggered the setting.
     */
    async handle(interaction: GuildInteraction<UpdatableInteraction>): Promise<void> {
        const value = await this.store.get(interaction.guildID) as string[] | null;

        if (!Array.isArray(value) && !(this.nullable && value === null)) {
            throw new Error(`The setting '${String(this.store.getKey())}' is not of type 'string[]'.`);
        }

        await interaction.editParent({
            components: [{
                components: [{
                    channel_types: this.channelTypes ?? DEFAULT_CHANNEL_TYPES,
                    custom_id: "config-channels",
                    // @ts-expect-error discord.js is lazy
                    default_values: value?.map((value: string) => ({
                        id: value,
                        type: "channel"
                    })),
                    max_values: this.maximum ?? 25,
                    min_values: this.minimum ?? 0,
                    placeholder: this.description,
                    type: ComponentType.ChannelSelect
                }],
                type: ComponentType.ActionRow
            }],
            content: `Please select the channels you want to set as the **${this.name}**.`
        });

        const response = await interaction.awaitMessageComponent({
            customIDs: ["config-channels"]
        });

        if (!response?.data.isChannelSelect()) {
            return interaction.editParent(timeoutContent);
        }

        await response.deferUpdate();

        const channelIDs = response.data.values;
        await this.store.set(interaction.guildID, channelIDs as T[K]);
    }
}
