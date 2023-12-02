import {
    type GuildSettingOptionDataWithSize,
    type OptionalCallback,
    GuildSettingType,
    TypedGuildSettingOption
} from "../option.js";
import type { GuildInteraction, UpdatableInteraction } from "@barry-bot/core";
import type { BaseSettings } from "../../types/modules.js";

import { ComponentType, SelectMenuDefaultValueType } from "@discordjs/core";
import { timeoutContent } from "../../common.js";

/**
 * Represents a role array guild setting.
 */
export class RoleArrayGuildSettingOption<
    T extends BaseSettings,
    K extends Extract<keyof T, string>
> extends TypedGuildSettingOption<RoleArrayGuildSettingOption<T, K>, T, K> {
    /**
     * The maximum amount of roles that can be selected.
     */
    maximum?: number;

    /**
     * The minimum amount of roles that can be selected.
     */
    minimum?: number;

    /**
     * Represents a role array guild setting.
     *
     * @param options The options for the setting.
     */
    constructor(options: OptionalCallback<GuildSettingOptionDataWithSize<RoleArrayGuildSettingOption<T, K>>>) {
        super({
            onEdit: (self, interaction) => this.handle(interaction),
            onView: (self, interaction) => this.getValue(interaction),
            type: GuildSettingType.RoleArray,
            ...options
        });

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
        const value = await this.get(interaction.guildID) as string[] | null;
        return value !== null && value.length > 0
            ? value.map((id) => `<@&${id}>`).join(", ")
            : "`None`";
    }

    /**
     * Handles the interaction for the setting.
     *
     * @param interaction The interaction that triggered the setting.
     */
    async handle(interaction: GuildInteraction<UpdatableInteraction>): Promise<void> {
        const value = await this.get(interaction.guildID) as string[] | null;

        if (!Array.isArray(value) && !(this.nullable && value === null)) {
            throw new Error(`The setting '${this.key}' is not of type 'string[]'.`);
        }

        await interaction.editParent({
            components: [{
                components: [{
                    custom_id: "config-roles",
                    default_values: value?.map((value: string) => ({
                        id: value,
                        type: SelectMenuDefaultValueType.Role
                    })),
                    max_values: this.maximum ?? 25,
                    min_values: this.minimum ?? 0,
                    placeholder: this.description,
                    type: ComponentType.RoleSelect
                }],
                type: ComponentType.ActionRow
            }],
            content: `Please select the roles you want to set as the **${this.name}**.`
        });

        const response = await interaction.awaitMessageComponent({
            customIDs: ["config-roles"]
        });

        if (!response?.data.isRoleSelect()) {
            return interaction.editParent(timeoutContent);
        }

        await response.deferUpdate();

        const roleIDs = response.data.values;
        await this.set(interaction.guildID, roleIDs as T[K]);
    }
}
