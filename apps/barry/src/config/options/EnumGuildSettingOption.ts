import {
    type BaseGuildSettingOptionData,
    type OptionalCallback,
    GuildSettingType,
    TypedGuildSettingOption
} from "../option.js";
import type { GuildInteraction, UpdatableInteraction } from "@barry/core";
import type { BaseSettings } from "../../types/modules.js";

import { ComponentType } from "@discordjs/core";
import { timeoutContent } from "../../common.js";

/**
 * Options for an enum guild setting.
 */
export interface EnumGuildSettingOptionData<
    T extends BaseSettings,
    K extends Extract<keyof T, string>
> extends BaseGuildSettingOptionData<EnumGuildSettingOption<T, K>> {
    /**
     * The values of the setting.
     */
    values: string[];
}

/**
 * Represents an enum guild setting.
 */
export class EnumGuildSettingOption<
    T extends BaseSettings,
    K extends Extract<keyof T, string>
> extends TypedGuildSettingOption<EnumGuildSettingOption<T, K>, T, K> {
    /**
     * The values that can be selected.
     */
    values: string[];

    /**
     * Represents an enum guild setting.
     *
     * @param options The options for the setting.
     */
    constructor(options: OptionalCallback<EnumGuildSettingOptionData<T, K>>) {
        super({
            onEdit: (self, interaction) => this.handle(interaction),
            onView: (self, interaction) => this.getValue(interaction),
            type: GuildSettingType.Enum,
            ...options
        });

        this.values = options.values;
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
            ? `\`\`${value}\`\``
            : "`None`";
    }

    /**
     * Handles the interaction for the setting.
     *
     * @param interaction The interaction that triggered the setting.
     */
    async handle(interaction: GuildInteraction<UpdatableInteraction>): Promise<void> {
        const oldValue = await this.get(interaction.guildID);

        if (typeof oldValue !== "string" && !(this.nullable && oldValue === null)) {
            throw new Error(`The setting '${this.key}' is not of type 'string'.`);
        }

        await interaction.editParent({
            components: [{
                components: [{
                    custom_id: "config-enum",
                    min_values: this.nullable ? 0 : 1,
                    options: this.values.map((value) => ({
                        default: value === oldValue,
                        label: value,
                        value: value
                    })),
                    placeholder: this.description,
                    type: ComponentType.StringSelect
                }],
                type: ComponentType.ActionRow
            }],
            content: `Please select the value you want to set as the **${this.name}**.`
        });

        const response = await interaction.awaitMessageComponent({
            customIDs: ["config-enum"]
        });

        if (!response?.data.isStringSelect()) {
            return interaction.editParent(timeoutContent);
        }

        await response.deferUpdate();

        const newValue = response.data.values[0] || null;
        if (newValue !== oldValue) {
            await this.set(interaction.guildID, newValue as T[K]);
        }
    }
}
