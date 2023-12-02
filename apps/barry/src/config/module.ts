import {
    type BaseGuildSettingOptionData,
    type GuildSettingType,
    CustomGuildSettingOption
} from "./option.js";
import type { BaseSettings, SettingsRepository } from "../types/modules.js";
import type {
    BooleanGuildSettingOption,
    ChannelArrayGuildSettingOption,
    ChannelGuildSettingOption,
    EmojiGuildSettingOption,
    EnumGuildSettingOption,
    FloatGuildSettingOption,
    IntegerGuildSettingOption,
    RoleArrayGuildSettingOption,
    RoleGuildSettingOption,
    StringGuildSettingOption
} from "./options/index.js";
import type { Application } from "../Application.js";

import { GuildSettingsStore } from "./store.js";
import { Module } from "@barry-bot/core";

/**
 * Represents any typed guild setting option.
 */
export type AnyTypedGuildSettingOption<T extends BaseSettings, K extends Extract<keyof T, string>>
    = TypedGuildSettingOptionMap<T, K>[keyof TypedGuildSettingOptionMap<T, K>];

/**
 * Represents the data for configuring a module.
 */
export type AnyGuildSettingOptionsRepositoryData<T extends ConfigurableModule<T>> =
    GuildSettingOptionsRepositoryData<ExtractRepositoryValues<T>>;

/**
 * Represents any guild setting option.
 */
export type AnyGuildSettingOption<
    T extends BaseSettings = BaseSettings,
    K extends Extract<keyof T, string> = Extract<keyof T, string>
> = AnyTypedGuildSettingOption<T, K> | CustomGuildSettingOption<unknown>;

/**
 * Represents entries ([key, value][]) of an object.
 */
type Entries<T extends object> = Array<{ [P in keyof T]: [P, T[P]] }[keyof T]>;

/**
 * Represents the keys of all repositories on a module.
 */
export type ExtractRepositoryKeys<T extends ConfigurableModule<T>> = {
    [P in keyof T]: T[P] extends SettingsRepository<BaseSettings> ? P : never;
}[keyof T];

/**
 * Represents the values of all repositories on a module.
 */
export type ExtractRepositoryValues<T extends ConfigurableModule<T>> = {
    [P in keyof T]: T[P] extends SettingsRepository<infer U> ? U : never;
}[keyof T];

/**
 * Represents the data for configuring a module.
 */
export type GuildSettingOptionsData<T extends ConfigurableModule<T>> = {
    [P in ExtractRepositoryKeys<T>]?: T[P] extends SettingsRepository<infer U>
        ? Partial<GuildSettingOptionsRepositoryData<U>>
        : never;
};

/**
 * Represents the data for configuring a repository.
 */
export type GuildSettingOptionsRepositoryData<T extends BaseSettings> = {
    [K in Extract<keyof T, string>]: AnyTypedGuildSettingOption<T, K>;
};

/**
 * A map of each guild setting type to its corresponding option.
 */
export interface TypedGuildSettingOptionMap<
    T extends BaseSettings,
    K extends Extract<keyof T, string> = Extract<keyof T, string>
> {
    [GuildSettingType.Boolean]: BooleanGuildSettingOption<T, K>;
    [GuildSettingType.Channel]: ChannelGuildSettingOption<T, K>;
    [GuildSettingType.ChannelArray]: ChannelArrayGuildSettingOption<T, K>;
    [GuildSettingType.Emoji]: EmojiGuildSettingOption<T, any, K>;
    [GuildSettingType.Enum]: EnumGuildSettingOption<T, K>;
    [GuildSettingType.Float]: FloatGuildSettingOption<T, K>;
    [GuildSettingType.Integer]: IntegerGuildSettingOption<T, K>;
    [GuildSettingType.Role]: RoleGuildSettingOption<T, K>;
    [GuildSettingType.RoleArray]: RoleArrayGuildSettingOption<T, K>;
    [GuildSettingType.String]: StringGuildSettingOption<T, K>;
}

/**
 * Type-safe version of Object.entries.
 *
 * @param obj The object to get the entries of.
 * @returns The entries of the object.
 */
function getEntries<T extends object>(obj: T): Entries<T> {
    return Object.entries(obj) as Entries<T>;
}

/**
 * Represents a module that can be configured.
 */
export abstract class ConfigurableModule<
    T extends ConfigurableModule<T>
> extends Module<Application> implements ConfigurableModule<T> {
    /**
     * The configuration for the module.
     */
    #options: Array<AnyGuildSettingOption<ExtractRepositoryValues<T>>> = [];

    /**
     * Defines the configuration for the module.
     *
     * @param config The configuration for the module.
     */
    defineConfig(config: GuildSettingOptionsData<T>): void {
        for (const [repositoryKey, options] of getEntries(config)) {
            if (options === undefined) {
                continue;
            }

            const repository = this[repositoryKey as keyof this] as SettingsRepository<ExtractRepositoryValues<T>>;
            const store = new GuildSettingsStore<ExtractRepositoryValues<T>>()
                .setRepository(repository);

            for (const [optionKey, option] of getEntries(options as AnyGuildSettingOptionsRepositoryData<T>)) {
                if (option === undefined) {
                    continue;
                }

                option.store = store;
                option.key = optionKey;

                this.#options.push(option);
            }
        }
    }

    /**
     * Defines a custom option for the module.
     *
     * @param data The data for the custom option.
     */
    defineCustom(data: BaseGuildSettingOptionData<CustomGuildSettingOption<any>>): void {
        const option = new CustomGuildSettingOption(data);
        this.#options.push(option);
    }

    /**
     * Returns the configuration for the module.
     *
     * @returns The configuration for the module.
     */
    getConfig(): Array<AnyGuildSettingOption<ExtractRepositoryValues<T>>> {
        return this.#options;
    }
}
