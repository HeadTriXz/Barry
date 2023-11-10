import type { GuildInteraction, UpdatableInteraction } from "@barry/core";
import {
    type BaseGuildSettingOptionData,
    type OptionalCallback,
    GuildSettingType,
    TypedGuildSettingOption
} from "../option.js";
import type { BaseSettings } from "../../types/modules.js";

/**
 * Represents a boolean guild setting.
 */
export class BooleanGuildSettingOption<
    T extends BaseSettings,
    K extends keyof T
> extends TypedGuildSettingOption<BooleanGuildSettingOption<T, K>, T, K> {
    /**
     * Represents a boolean guild setting.
     *
     * @param options The options for the setting.
     */
    constructor(options: OptionalCallback<BaseGuildSettingOptionData<BooleanGuildSettingOption<T, K>>>) {
        super({
            onEdit: (self, interaction) => this.handle(interaction),
            onView: (self, interaction) => this.getValue(interaction),
            type: GuildSettingType.Boolean,
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
        const value = await this.store.get(interaction.guildID);
        if (value === null) {
            return "`None`";
        }

        return value ? "`True`" : "`False`";
    }

    /**
     * Handles editing the setting.
     *
     * @param interaction The interaction that triggered the setting.
     */
    async handle(interaction: GuildInteraction<UpdatableInteraction>): Promise<void> {
        const value = await this.store.get(interaction.guildID);

        if (typeof value !== "boolean" && !(this.nullable && value === null)) {
            throw new Error(`The setting '${String(this.store.getKey())}' is not of type 'boolean'.`);
        }

        await this.store.set(interaction.guildID, !value as T[K]);
    }
}
