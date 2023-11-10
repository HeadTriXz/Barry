import {
    type GuildSettingOptionDataWithSize,
    type OptionalCallback,
    GuildSettingType,
    TypedGuildSettingOption
} from "../option.js";
import type { GuildInteraction, UpdatableInteraction } from "@barry/core";
import type { BaseSettings } from "../../types/modules.js";

import { ComponentType, MessageFlags, TextInputStyle } from "@discordjs/core";
import { timeoutContent } from "../../common.js";
import config from "../../config.js";

/**
 * Represents a float guild setting.
 */
export class FloatGuildSettingOption<
    T extends BaseSettings,
    K extends keyof T
> extends TypedGuildSettingOption<FloatGuildSettingOption<T, K>, T, K> {
    /**
     * The maximum value of the setting.
     */
    maximum?: number;

    /**
     * The minimum value of the setting.
     */
    minimum?: number;

    /**
     * Represents a float guild setting.
     *
     * @param options The options for the setting.
     */
    constructor(options: OptionalCallback<GuildSettingOptionDataWithSize<FloatGuildSettingOption<T, K>>>) {
        super({
            onEdit: (self, interaction) => this.handle(interaction),
            onView: (self, interaction) => this.getValue(interaction),
            type: GuildSettingType.Float,
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
        const value = await this.store.get(interaction.guildID);
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
        const value = await this.store.get(interaction.guildID);

        if (typeof value !== "number" && !(this.nullable && value === null)) {
            throw new Error(`The setting '${String(this.store.getKey())}' is not of type 'number'.`);
        }

        const key = `config-float-${Date.now()}`;
        await interaction.createModal({
            components: [{
                components: [{
                    custom_id: "float",
                    label: this.name,
                    min_length: this.nullable ? 0 : 1,
                    placeholder: this.description,
                    style: TextInputStyle.Short,
                    type: ComponentType.TextInput,
                    value: value !== null ? String(value) : ""
                }],
                type: ComponentType.ActionRow
            }],
            custom_id: key,
            title: "Select a float"
        });

        const response = await interaction.awaitModalSubmit(key);
        if (response === undefined) {
            return interaction.editParent(timeoutContent);
        }

        await response.deferUpdate();

        let float: number | null = null;
        if (response.values.float !== "") {
            float = Number(response.values.float);
            if (isNaN(float)) {
                return response.createMessage({
                    content: `${config.emotes.error} The value you entered is not a float.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            if (this.minimum !== undefined && float < this.minimum) {
                return response.createMessage({
                    content: `${config.emotes.error} The value you entered is too small.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            if (this.maximum !== undefined && float > this.maximum) {
                return response.createMessage({
                    content: `${config.emotes.error} The value you entered is too large.`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        if (float === null && !this.nullable) {
            return response.createMessage({
                content: `${config.emotes.error} The value you entered is not a float.`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (float !== value) {
            await this.store.set(interaction.guildID, float as T[K]);
        }
    }
}
