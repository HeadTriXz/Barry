import {
    type BaseGuildSettingOptionData,
    type OptionalCallback,
    GuildSettingType,
    TypedGuildSettingOption
} from "../option.js";
import type { GuildInteraction, UpdatableInteraction } from "@barry-bot/core";
import type { BaseSettings } from "../../types/modules.js";

import { ComponentType, SelectMenuDefaultValueType } from "@discordjs/core";
import { timeoutContent } from "../../common.js";

/**
 * Represents a role guild setting.
 */
export class RoleGuildSettingOption<
    T extends BaseSettings,
    K extends Extract<keyof T, string>
> extends TypedGuildSettingOption<RoleGuildSettingOption<T, K>, T, K> {
    /**
     * Represents a role guild setting.
     *
     * @param options The options for the setting.
     */
    constructor(options: OptionalCallback<BaseGuildSettingOptionData<RoleGuildSettingOption<T, K>>>) {
        super({
            onEdit: (self, interaction) => this.handle(interaction),
            onView: (self, interaction) => this.getValue(interaction),
            type: GuildSettingType.Role,
            ...options
        });
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
            ? `<@&${value}>`
            : "`None`";
    }

    /**
     * Handles the interaction for the setting.
     *
     * @param interaction The interaction that triggered the setting.
     */
    async handle(interaction: GuildInteraction<UpdatableInteraction>): Promise<void> {
        const value = await this.get(interaction.guildID) as string | null;

        if (typeof value !== "string" && !(this.nullable && value === null)) {
            throw new Error(`The setting '${this.key}' is not of type 'string'.`);
        }

        await interaction.editParent({
            components: [{
                components: [{
                    custom_id: "config-role",
                    default_values: value !== null
                        ? [{ id: value, type: SelectMenuDefaultValueType.Role }]
                        : undefined,
                    min_values: this.nullable ? 0 : 1,
                    placeholder: this.description,
                    type: ComponentType.RoleSelect
                }],
                type: ComponentType.ActionRow
            }],
            content: `Please select the role you want to set as the **${this.name}**.`
        });

        const response = await interaction.awaitMessageComponent({
            customIDs: ["config-role"]
        });

        if (!response?.data.isRoleSelect()) {
            return interaction.editParent(timeoutContent);
        }

        await response.deferUpdate();

        const newValue = response.data.values[0] || null;
        if (newValue !== value) {
            await this.set(interaction.guildID, newValue as T[K]);
        }
    }
}
