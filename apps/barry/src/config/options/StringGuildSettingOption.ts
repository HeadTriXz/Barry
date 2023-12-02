import {
    type GuildSettingOptionDataWithSize,
    type OptionalCallback,
    GuildSettingType,
    TypedGuildSettingOption
} from "../option.js";
import type { GuildInteraction, UpdatableInteraction } from "@barry-bot/core";
import type { BaseSettings } from "../../types/modules.js";

import { ComponentType, MessageFlags, TextInputStyle } from "@discordjs/core";
import { timeoutContent } from "../../common.js";
import config from "../../config.js";

/**
 * Represents a string guild setting.
 */
export class StringGuildSettingOption<
    T extends BaseSettings,
    K extends Extract<keyof T, string>
> extends TypedGuildSettingOption<StringGuildSettingOption<T, K>, T, K> {
    /**
     * The maximum length of the setting.
     */
    maximum?: number;

    /**
     * The minimum length of the setting.
     */
    minimum?: number;

    /**
     * Represents a string guild setting.
     *
     * @param options The options for the setting.
     */
    constructor(options: OptionalCallback<GuildSettingOptionDataWithSize<StringGuildSettingOption<T, K>>>) {
        super({
            onEdit: (self, interaction) => this.handle(interaction),
            onView: (self, interaction) => this.getValue(interaction),
            type: GuildSettingType.String,
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
        const value = await this.get(interaction.guildID) as string | null;

        if (typeof value !== "string" && !(this.nullable && value === null)) {
            throw new Error(`The setting '${this.key}' is not of type 'string'.`);
        }

        const key = `config-string-${Date.now()}`;
        await interaction.createModal({
            components: [{
                components: [{
                    custom_id: "string",
                    label: this.name,
                    max_length: this.maximum,
                    min_length: this.nullable ? 0 : this.minimum,
                    placeholder: this.description,
                    style: TextInputStyle.Short,
                    type: ComponentType.TextInput,
                    value: value || ""
                }],
                type: ComponentType.ActionRow
            }],
            custom_id: key,
            title: "Select a string"
        });

        const response = await interaction.awaitModalSubmit(key);
        if (response === undefined) {
            return interaction.editParent(timeoutContent);
        }

        await response.deferUpdate();

        const string = response.values.string || null;
        if (string !== null && this.minimum !== undefined && string.length < this.minimum) {
            return response.createMessage({
                content: `${config.emotes.error} The value you entered is too short.`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (string !== value) {
            await this.set(interaction.guildID, string as T[K]);
        }
    }
}
