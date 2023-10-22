import type { Module, UpdatableInteraction } from "@barry/core";
import { type ParsedGuildSettingOption, GuildSettingType } from "../../../../../ConfigurableModule.js";
import {
    ChannelType,
    ComponentType,
    MessageFlags,
    TextInputStyle
} from "@discordjs/core";
import { timeoutContent } from "../../../../../common.js";

import emotes from "../../../../../config.js";
import { getEmoji, normalizeEmoji } from "./emojis.js";

/**
 * The base settings for a guild.
 */
export interface BaseGuildSettings extends Record<string, any> {
    /**
     * The ID of the guild these settings belong to.
     */
    guildID: string;
}

/**
 * The default channel types for channel settings.
 */
const DEFAULT_CHANNEL_TYPES = [
    ChannelType.GuildText,
    ChannelType.GuildVoice,
    ChannelType.GuildStageVoice
];

/**
 * Represents a handler for updating guild settings.
 */
export class ModifyGuildSettingHandlers<T extends Module, U extends BaseGuildSettings> {
    /**
     * The module the settings belong to.
     */
    #module: T;

    /**
     * Represents a handler for updating guild settings.
     *
     * @param module The module the settings belong to.
     */
    constructor(module: T) {
        this.#module = module;
    }

    /**
     * Handles updating a boolean setting.
     *
     * @param settings The current settings.
     * @param config The configuration for the specified option.
     */
    async boolean(
        settings: U,
        config: ParsedGuildSettingOption<T, GuildSettingType.Boolean, U>
    ): Promise<void> {
        const value = settings[config.key];
        if (typeof value !== "boolean" && !(config.nullable && value === null)) {
            throw new Error(`The setting '${String(config.key)}' is not of type 'boolean'.`);
        }

        await config.repository.upsert(settings.guildID, {
            [config.key]: !value
        });

        settings[config.key] = !value as U[keyof U];
    }

    /**
     * Handles updating a channel setting.
     *
     * @param interaction The interaction that invoked the command.
     * @param settings The current settings.
     * @param config The configuration for the specified option.
     */
    async channel(
        interaction: UpdatableInteraction,
        settings: U,
        config: ParsedGuildSettingOption<T, GuildSettingType.Channel, U>
    ): Promise<void> {
        const value = settings[config.key];
        if (typeof value !== "string" && !(config.nullable && value === null)) {
            throw new Error(`The setting '${String(config.key)}' is not of type 'string'.`);
        }

        await interaction.editParent({
            components: [{
                components: [{
                    channel_types: config.channelTypes ?? DEFAULT_CHANNEL_TYPES,
                    custom_id: "config-channel",
                    // @ts-expect-error discord.js is lazy
                    default_values: value !== null
                        ? [{ id: value, type: "channel" }]
                        : undefined,
                    min_values: config.nullable ? 0 : 1,
                    placeholder: config.description,
                    type: ComponentType.ChannelSelect
                }],
                type: ComponentType.ActionRow
            }],
            content: `Please select the channel you want to set as the **${config.name}**.`
        });

        const response = await interaction.awaitMessageComponent({
            customIDs: ["config-channel"]
        });

        if (!response?.data.isChannelSelect()) {
            return interaction.editParent(timeoutContent);
        }

        await response.deferUpdate();

        const newValue = response.data.values[0] || null;
        await config.repository.upsert(settings.guildID, {
            [config.key]: newValue
        });

        settings[config.key] = newValue as U[keyof U];
    }

    /**
     * Handles updating a channel array setting.
     *
     * @param interaction The interaction that invoked the command.
     * @param settings The current settings.
     * @param config The configuration for the specified option.
     */
    async channelArray(
        interaction: UpdatableInteraction,
        settings: U,
        config: ParsedGuildSettingOption<T, GuildSettingType.ChannelArray, U>
    ): Promise<void> {
        const value = settings[config.key] as string[] | null;
        if (!Array.isArray(value) && !(config.nullable && value === null)) {
            throw new Error(`The setting '${String(config.key)}' is not of type 'string[]'.`);
        }

        await interaction.editParent({
            components: [{
                components: [{
                    channel_types: config.channelTypes ?? DEFAULT_CHANNEL_TYPES,
                    custom_id: "config-channels",
                    // @ts-expect-error discord.js is lazy
                    default_values: value?.map((value: string) => ({
                        id: value,
                        type: "channel"
                    })),
                    max_values: config.maximum ?? 25,
                    min_values: config.minimum ?? 0,
                    placeholder: config.description,
                    type: ComponentType.ChannelSelect
                }],
                type: ComponentType.ActionRow
            }],
            content: `Please select the channels you want to set as the **${config.name}**.`
        });

        const response = await interaction.awaitMessageComponent({
            customIDs: ["config-channels"]
        });

        if (!response?.data.isChannelSelect()) {
            return interaction.editParent(timeoutContent);
        }

        await response.deferUpdate();

        const newValue = response.data.values;
        await config.repository.upsert(settings.guildID, {
            [config.key]: newValue
        });

        settings[config.key] = newValue as U[keyof U];
    }

    /**
     * Handles updating an emoji setting.
     *
     * @param interaction The interaction that invoked the command.
     * @param settings The current settings.
     * @param config The configuration for the specified option.
     */
    async emoji(
        interaction: UpdatableInteraction,
        settings: U,
        config: ParsedGuildSettingOption<T, GuildSettingType.Emoji, U>
    ): Promise<void> {
        const oldEmojiID = settings[config.emojiKeys.id] as string | null;
        const oldEmojiName = settings[config.emojiKeys.name] as string | null;

        if (typeof oldEmojiID !== "string" && oldEmojiID !== null) {
            throw new Error(`The setting '${config.emojiKeys.id}' is not of type 'string'.`);
        }

        if (typeof oldEmojiName !== "string" && !(config.nullable && oldEmojiName === null)) {
            throw new Error(`The setting '${config.emojiKeys.name}' is not of type 'string'.`);
        }

        const key = `config-emoji-${Date.now()}`;
        await interaction.createModal({
            components: [{
                components: [{
                    custom_id: "emoji",
                    label: config.name,
                    min_length: config.nullable ? 0 : 1,
                    placeholder: "e.g., 😁, :smile:, or <:custom:1234567890123456789>",
                    style: TextInputStyle.Short,
                    type: ComponentType.TextInput,
                    value: oldEmojiName || ""
                }],
                type: ComponentType.ActionRow
            }],
            custom_id: key,
            title: "Select an emoji"
        });

        const response = await interaction.awaitModalSubmit(key);
        if (response === undefined) {
            return interaction.editParent(timeoutContent);
        }

        await response.deferUpdate();

        let emojiID: string | null = null;
        let emojiName: string | null = null;

        const newValue = normalizeEmoji(response.values.emoji);
        if (newValue !== "") {
            const emoji = getEmoji(newValue);
            if (emoji !== null) {
                emojiID = emoji.id;
                emojiName = emoji.name;
            } else {
                const emojis = await this.#module.client.api.guilds.getEmojis(settings.guildID);
                const emoji = emojis.find((emoji) => emoji.name === newValue);
                if (emoji !== undefined) {
                    emojiID = emoji.id;
                    emojiName = emoji.name;
                }
            }
        }

        if (emojiName === null && !config.nullable) {
            return response.createMessage({
                content: `${emotes.emotes.error} The value you entered is not an emoji.`,
                flags: MessageFlags.Ephemeral
            });
        }

        await config.repository.upsert(settings.guildID, {
            [config.emojiKeys.id]: emojiID,
            [config.emojiKeys.name]: emojiName
        });

        settings[config.emojiKeys.id as keyof U] = emojiID as U[keyof U];
        settings[config.emojiKeys.name as keyof U] = emojiName as U[keyof U];
    }

    /**
     * Handles updating an enum setting.
     *
     * @param interaction The interaction that invoked the command.
     * @param settings The current settings.
     * @param config The configuration for the specified option.
     */
    async enum(
        interaction: UpdatableInteraction,
        settings: U,
        config: ParsedGuildSettingOption<T, GuildSettingType.Enum, U>
    ): Promise<void> {
        const value = settings[config.key];
        if (typeof value !== "string" && !(config.nullable && value === null)) {
            throw new Error(`The setting '${String(config.key)}' is not of type 'string'.`);
        }

        await interaction.editParent({
            components: [{
                components: [{
                    custom_id: "config-enum",
                    min_values: config.nullable ? 0 : 1,
                    options: config.values.map((value) => ({
                        default: value === settings[config.key],
                        label: value,
                        value: value
                    })),
                    placeholder: config.description,
                    type: ComponentType.StringSelect
                }],
                type: ComponentType.ActionRow
            }],
            content: `Please select the value you want to set as the **${config.name}**.`
        });

        const response = await interaction.awaitMessageComponent({
            customIDs: ["config-enum"]
        });

        if (!response?.data.isStringSelect()) {
            return interaction.editParent(timeoutContent);
        }

        await response.deferUpdate();

        const newValue = response.data.values[0] || null;
        await config.repository.upsert(settings.guildID, {
            [config.key]: newValue
        });

        settings[config.key] = newValue as U[keyof U];
    }

    /**
     * Handles updating a float setting.
     *
     * @param interaction The interaction that invoked the command.
     * @param settings The current settings.
     * @param config The configuration for the specified option.
     */
    async float(
        interaction: UpdatableInteraction,
        settings: U,
        config: ParsedGuildSettingOption<T, GuildSettingType.Float, U>
    ): Promise<void> {
        const value = settings[config.key];
        if (typeof value !== "number" && !(config.nullable && value === null)) {
            throw new Error(`The setting '${String(config.key)}' is not of type 'number'.`);
        }

        const key = `config-float-${Date.now()}`;
        await interaction.createModal({
            components: [{
                components: [{
                    custom_id: "float",
                    label: config.name,
                    min_length: config.nullable ? 0 : 1,
                    placeholder: config.description,
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
                    content: `${emotes.emotes.error} The value you entered is not a float.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            if (config.minimum !== undefined && float < config.minimum) {
                return response.createMessage({
                    content: `${emotes.emotes.error} The value you entered is too small.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            if (config.maximum !== undefined && float > config.maximum) {
                return response.createMessage({
                    content: `${emotes.emotes.error} The value you entered is too large.`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        if (float === null && !config.nullable) {
            return response.createMessage({
                content: `${emotes.emotes.error} The value you entered is not a float.`,
                flags: MessageFlags.Ephemeral
            });
        }

        await config.repository.upsert(settings.guildID, {
            [config.key]: float
        });

        settings[config.key] = float as U[keyof U];
    }

    /**
     * Handles updating a setting.
     *
     * @param interaction The interaction that invoked the command.
     * @param settings The current settings.
     * @param config The configuration for the specified option.
     */
    async handle(
        interaction: UpdatableInteraction,
        settings: U,
        config: ParsedGuildSettingOption<T, GuildSettingType, U>
    ): Promise<void> {
        switch (config.type) {
            case GuildSettingType.Boolean: {
                return this.boolean(settings, config);
            }
            case GuildSettingType.Channel: {
                return this.channel(interaction, settings, config);
            }
            case GuildSettingType.ChannelArray: {
                return this.channelArray(interaction, settings, config);
            }
            case GuildSettingType.Custom: {
                const handler = config.base !== undefined
                    ? this.handle.bind(this, interaction, settings, { ...config, type: config.base })
                    : () => Promise.resolve();

                return config.callback?.(interaction, settings, handler);
            }
            case GuildSettingType.Emoji: {
                return this.emoji(interaction, settings, config);
            }
            case GuildSettingType.Enum: {
                return this.enum(interaction, settings, config);
            }
            case GuildSettingType.Float: {
                return this.float(interaction, settings, config);
            }
            case GuildSettingType.Integer: {
                return this.integer(interaction, settings, config);
            }
            case GuildSettingType.Role: {
                return this.role(interaction, settings, config);
            }
            case GuildSettingType.RoleArray: {
                return this.roleArray(interaction, settings, config);
            }
            case GuildSettingType.String: {
                return this.string(interaction, settings, config);
            }
        }
    }

    /**
     * Handles updating an integer setting.
     *
     * @param interaction The interaction that invoked the command.
     * @param settings The current settings.
     * @param config The configuration for the specified option.
     */
    async integer(
        interaction: UpdatableInteraction,
        settings: U,
        config: ParsedGuildSettingOption<T, GuildSettingType.Integer, U>
    ): Promise<void> {
        const value = settings[config.key];
        if (typeof value !== "number" && !(config.nullable && value === null)) {
            throw new Error(`The setting '${String(config.key)}' is not of type 'number'.`);
        }

        const key = `config-integer-${Date.now()}`;
        await interaction.createModal({
            components: [{
                components: [{
                    custom_id: "integer",
                    label: config.name,
                    min_length: config.nullable ? 0 : 1,
                    placeholder: config.description,
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
                    content: `${emotes.emotes.error} The value you entered is not an integer.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            if (config.minimum !== undefined && integer < config.minimum) {
                return response.createMessage({
                    content: `${emotes.emotes.error} The value you entered is too small.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            if (config.maximum !== undefined && integer > config.maximum) {
                return response.createMessage({
                    content: `${emotes.emotes.error} The value you entered is too large.`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        if (integer === null && !config.nullable) {
            return response.createMessage({
                content: `${emotes.emotes.error} The value you entered is not an integer.`,
                flags: MessageFlags.Ephemeral
            });
        }

        await config.repository.upsert(settings.guildID, {
            [config.key]: integer
        });

        settings[config.key] = integer as U[keyof U];
    }

    /**
     * Handles updating a role setting.
     *
     * @param interaction The interaction that invoked the command.
     * @param settings The current settings.
     * @param config The configuration for the specified option.
     */
    async role(
        interaction: UpdatableInteraction,
        settings: U,
        config: ParsedGuildSettingOption<T, GuildSettingType.Role, U>
    ): Promise<void> {
        const value = settings[config.key];
        if (typeof value !== "string" && !(config.nullable && value === null)) {
            throw new Error(`The setting '${String(config.key)}' is not of type 'string'.`);
        }

        await interaction.editParent({
            components: [{
                components: [{
                    custom_id: "config-role",
                    // @ts-expect-error discord.js is lazy
                    default_values: value !== null
                        ? [{ id: value, type: "role" }]
                        : undefined,
                    min_values: config.nullable ? 0 : 1,
                    placeholder: config.description,
                    type: ComponentType.RoleSelect
                }],
                type: ComponentType.ActionRow
            }],
            content: `Please select the role you want to set as the **${config.name}**.`
        });

        const response = await interaction.awaitMessageComponent({
            customIDs: ["config-role"]
        });

        if (!response?.data.isRoleSelect()) {
            return interaction.editParent(timeoutContent);
        }

        await response.deferUpdate();

        const newValue = response.data.values[0] || null;
        await config.repository.upsert(settings.guildID, {
            [config.key]: newValue
        });

        settings[config.key] = newValue as U[keyof U];
    }

    /**
     * Handles updating a role array setting.
     *
     * @param interaction The interaction that invoked the command.
     * @param settings The current settings.
     * @param config The configuration for the specified option.
     */
    async roleArray(
        interaction: UpdatableInteraction,
        settings: U,
        config: ParsedGuildSettingOption<T, GuildSettingType.RoleArray, U>
    ): Promise<void> {
        const value = settings[config.key] as string[] | null;
        if (!Array.isArray(value) && !(config.nullable && value === null)) {
            throw new Error(`The setting '${String(config.key)}' is not of type 'string[]'.`);
        }

        await interaction.editParent({
            components: [{
                components: [{
                    custom_id: "config-roles",
                    // @ts-expect-error discord.js is lazy
                    default_values: value?.map((value: string) => ({
                        id: value,
                        type: "role"
                    })),
                    max_values: config.maximum ?? 25,
                    min_values: config.minimum ?? 0,
                    placeholder: config.description,
                    type: ComponentType.RoleSelect
                }],
                type: ComponentType.ActionRow
            }],
            content: `Please select the roles you want to set as the **${config.name}**.`
        });

        const response = await interaction.awaitMessageComponent({
            customIDs: ["config-roles"]
        });

        if (!response?.data.isRoleSelect()) {
            return interaction.editParent(timeoutContent);
        }

        await response.deferUpdate();

        const newValue = response.data.values;
        await config.repository.upsert(settings.guildID, {
            [config.key]: newValue
        });

        settings[config.key] = newValue as U[keyof U];
    }

    /**
     * Handles updating a string setting.
     *
     * @param interaction The interaction that invoked the command.
     * @param settings The current settings.
     * @param config The configuration for the specified option.
     */
    async string(
        interaction: UpdatableInteraction,
        settings: U,
        config: ParsedGuildSettingOption<T, GuildSettingType.String, U>
    ): Promise<void> {
        const value = settings[config.key];
        if (typeof value !== "string" && !(config.nullable && value === null)) {
            throw new Error(`The setting '${String(config.key)}' is not of type 'string'.`);
        }

        const key = `config-string-${Date.now()}`;
        await interaction.createModal({
            components: [{
                components: [{
                    custom_id: "string",
                    label: config.name,
                    max_length: config.maximum,
                    min_length: config.nullable ? 0 : config.minimum,
                    placeholder: config.description,
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
        if (string !== null && config.minimum !== undefined && string.length < config.minimum) {
            return response.createMessage({
                content: `${emotes.emotes.error} The value you entered is too short.`,
                flags: MessageFlags.Ephemeral
            });
        }

        await config.repository.upsert(settings.guildID, {
            [config.key]: string
        });

        settings[config.key] = string as U[keyof U];
    }
}
