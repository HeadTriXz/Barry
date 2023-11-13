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
 * Represents an integer guild setting.
 */
export class IntegerGuildSettingOption<
    T extends BaseSettings,
    K extends Extract<keyof T, string>
> extends TypedGuildSettingOption<IntegerGuildSettingOption<T, K>, T, K> {
    /**
     * The maximum value of the setting.
     */
    maximum?: number;

    /**
     * The minimum value of the setting.
     */
    minimum?: number;

    /**
     * Represents an integer guild setting.
     *
     * @param options The options for the setting.
     */
    constructor(options: OptionalCallback<GuildSettingOptionDataWithSize<IntegerGuildSettingOption<T, K>>>) {
        super({
            onEdit: (self, interaction) => this.handle(interaction),
            onView: (self, interaction) => this.getValue(interaction),
            type: GuildSettingType.Integer,
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
        const value = await this.get(interaction.guildID);

        if (typeof value !== "number" && !(this.nullable && value === null)) {
            throw new Error(`The setting '${this.key}' is not of type 'number'.`);
        }
        const key = `config-integer-${Date.now()}`;
        await interaction.createModal({
            components: [{
                components: [{
                    custom_id: "integer",
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
            title: "Select an integer"
        });

        const response = await interaction.awaitModalSubmit(key);
        if (response === undefined) {
            return interaction.editParent(timeoutContent);
        }

        await response.deferUpdate();

        let integer: number | null = null;
        if (response.values.integer !== "") {
            integer = Number(response.values.integer);
            if (!Number.isInteger(integer)) {
                return response.createMessage({
                    content: `${config.emotes.error} The value you entered is not an integer.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            if (this.minimum !== undefined && integer < this.minimum) {
                return response.createMessage({
                    content: `${config.emotes.error} The value you entered is too small.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            if (this.maximum !== undefined && integer > this.maximum) {
                return response.createMessage({
                    content: `${config.emotes.error} The value you entered is too large.`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        if (integer === null && !this.nullable) {
            return response.createMessage({
                content: `${config.emotes.error} The value you entered is not an integer.`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (integer !== value) {
            await this.set(interaction.guildID, integer as T[K]);
        }
    }
}
