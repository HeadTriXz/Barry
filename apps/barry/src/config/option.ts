import type { GuildInteraction, UpdatableInteraction } from "@barry/core";
import type { GuildSettingsStore, Nullable } from "./store.js";
import type { BaseSettings } from "../types/modules.js";

import { ChannelType } from "@discordjs/core";

/**
 * Represents the type of a setting.
 */
export enum GuildSettingType {
    Boolean,
    Channel,
    ChannelArray,
    Emoji,
    Enum,
    Float,
    Integer,
    Role,
    RoleArray,
    String
}

/**
 * The default channel types for channel settings.
 */
export const DEFAULT_CHANNEL_TYPES = [
    ChannelType.GuildText,
    ChannelType.GuildVoice,
    ChannelType.GuildStageVoice
];

/**
 * Represents a callback for editing a guild setting.
 */
export type EditGuildSettingCallback<T extends BaseGuildSettingOption<T>> = (
    self: T,
    interaction: GuildInteraction<UpdatableInteraction>
) => Promise<void>;

/**
 * Makes the callbacks for a guild setting optional.
 */
export type OptionalCallback<T extends BaseGuildSettingOptionData<any>> = Omit<T, "onEdit" | "onView"> & Partial<Pick<T, "onEdit" | "onView">>;

/**
 * Represents a callback for viewing a guild setting.
 */
export type ViewGuildSettingCallback<T extends BaseGuildSettingOption<T>> = (
    self: T,
    interaction: GuildInteraction<UpdatableInteraction>
) => Promise<string>;

/**
 * Options for a configurable guild setting.
 */
export interface BaseGuildSettingOptionData<T extends BaseGuildSettingOption<T>> {
    /**
     * The description of the setting.
     */
    description?: string;

    /**
     * The name of the setting.
     */
    name: string;

    /**
     * Whether the setting is nullable.
     */
    nullable?: boolean;

    /**
     * The callback for editing the setting.
     *
     * @param interaction The interaction that triggered the setting.
     */
    onEdit: EditGuildSettingCallback<T>;

    /**
     * The callback for viewing the setting.
     *
     * @param interaction The interaction that triggered the setting.
     * @returns The formatted string.
     */
    onView: ViewGuildSettingCallback<T>;
}

/**
 * Represents a configurable guild setting with a size.
 */
export interface GuildSettingOptionDataWithSize<
    T extends BaseGuildSettingOption<T>
> extends BaseGuildSettingOptionData<T> {
    /**
     * The maximum size of the setting.
     */
    maximum?: number;

    /**
     * The minimum size of the setting.
     */
    minimum?: number;
}

/**
 * Options for a typed configurable guild setting.
 */
export interface TypedGuildSettingOptionData<
    T extends TypedGuildSettingOption<T, any, any>
> extends BaseGuildSettingOptionData<T> {
    /**
     * The type of the setting.
     */
    type: GuildSettingType;
}

/**
 * Represents a configurable guild setting.
 */
export abstract class BaseGuildSettingOption<T extends BaseGuildSettingOption<T>> {
    /**
     * The description of the setting.
     */
    description?: string;

    /**
     * The name of the setting.
     */
    name: string;

    /**
     * Whether the setting is nullable.
     */
    nullable?: boolean;

    /**
     * The callback for editing the setting.
     *
     * @param interaction The interaction that triggered the setting.
     */
    onEdit: EditGuildSettingCallback<T>;

    /**
     * The callback for viewing the setting.
     *
     * @param interaction The interaction that triggered the setting.
     * @returns The formatted string.
     */
    onView: ViewGuildSettingCallback<T>;

    /**
     * Represents a configurable guild setting.
     *
     * @param options The options for the setting.
     */
    constructor(options: BaseGuildSettingOptionData<T>) {
        this.description = options.description;
        this.name = options.name;
        this.nullable = options.nullable;
        this.onEdit = options.onEdit;
        this.onView = options.onView;
    }

    /**
     * Retrieves the value of the setting.
     *
     * @param guildID The ID of the guild.
     * @returns The value of the setting.
     */
    abstract get(guildID: string): unknown;

    /**
     * Sets the value of the setting.
     *
     * @param guildID The ID of the guild.
     * @param value The value of the setting.
     */
    abstract set(guildID: string, value: unknown): void;
}

/**
 * Represents a typed configurable guild setting.
 */
export class TypedGuildSettingOption<
    S extends TypedGuildSettingOption<S, T, K>,
    T extends BaseSettings,
    K extends Extract<keyof T, string>
> extends BaseGuildSettingOption<S> {
    /**
     * The key of the setting.
     */
    key?: K;

    /**
     * The store to use to store the setting.
     */
    store?: GuildSettingsStore<T>;

    /**
     * The type of the setting.
     */
    type: GuildSettingType;

    /**
     * Represents a typed configurable guild setting.
     *
     * @param options The options for the setting.
     */
    constructor(options: TypedGuildSettingOptionData<S>) {
        super(options);

        this.type = options.type;
    }

    /**
     * Retrieves the value of the setting.
     *
     * @param guildID The ID of the guild.
     * @returns The value of the setting.
     */
    async get(guildID: string): Promise<Nullable<T>[K] | null> {
        if (this.key === undefined) {
            throw new Error("The key of the setting is undefined.");
        }

        if (this.store === undefined) {
            throw new Error("The store of the setting is undefined.");
        }

        return this.store.getValue(guildID, this.key);
    }

    /**
     * Sets the value of the setting.
     *
     * @param guildID The ID of the guild.
     * @param value The value of the setting.
     */
    async set(guildID: string, value: Nullable<T>[K]): Promise<void> {
        if (this.key === undefined) {
            throw new Error("The key of the setting is undefined.");
        }

        if (this.store === undefined) {
            throw new Error("The store of the setting is undefined.");
        }

        await this.store.setValue(guildID, this.key, value);
    }
}

/**
 * Represents a custom guild setting.
 */
export class CustomGuildSettingOption<T> extends BaseGuildSettingOption<CustomGuildSettingOption<T>> {
    /**
     * The internal cache to use to store the settings.
     */
    #cache: Map<string, T> = new Map();

    /**
     * Retrieves the value of the setting.
     *
     * @param guildID The ID of the guild.
     * @returns The value of the setting.
     */
    get(guildID: string): T | null {
        return this.#cache.get(guildID) ?? null;
    }

    /**
     * Sets the value of the setting.
     *
     * @param guildID The ID of the guild.
     * @param value The value of the setting.
     */
    set(guildID: string, value: T): void {
        this.#cache.set(guildID, value);
    }
}
