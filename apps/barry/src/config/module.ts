import {
    type BaseGuildSettingOptionData,
    type GuildSettingType,
    CustomGuildSettingOption
} from "./option.js";
import type { BaseSettings, SettingsRepository } from "../types/modules.js";
import {
    type BooleanGuildSettingOption,
    type ChannelArrayGuildSettingOption,
    type ChannelGuildSettingOption,
    type EnumGuildSettingOption,
    type FloatGuildSettingOption,
    type IntegerGuildSettingOption,
    type RoleArrayGuildSettingOption,
    type RoleGuildSettingOption,
    type StringGuildSettingOption,
    EmojiGuildSettingOption
} from "./options/index.js";
import type { Application } from "../Application.js";

import { Module } from "@barry/core";

/**
 * Represents any typed guild setting option.
 */
export type AnyTypedGuildSettingOption<T extends BaseSettings, K extends keyof T>
    = TypedGuildSettingOptionMap<T, K>[keyof TypedGuildSettingOptionMap<T, K>];

/**
 * Represents any guild setting option.
 */
export type AnyGuildSettingOption<
    T extends BaseSettings = BaseSettings,
    K extends keyof T = keyof T
> = AnyTypedGuildSettingOption<T, K> | CustomGuildSettingOption;

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
    [K in keyof T]: AnyTypedGuildSettingOption<T, K>;
};

/**
 * A map of each guild setting type to its corresponding option.
 */
export interface TypedGuildSettingOptionMap<
    T extends BaseSettings,
    K extends keyof T = keyof T
> {
    [GuildSettingType.Boolean]: BooleanGuildSettingOption<T, K>;
    [GuildSettingType.Channel]: ChannelGuildSettingOption<T, K>;
    [GuildSettingType.ChannelArray]: ChannelArrayGuildSettingOption<T, K>;
    [GuildSettingType.Emoji]: EmojiGuildSettingOption<T, any, any>;
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
    #options: AnyGuildSettingOption[] = [];

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

            for (const [optionKey, option] of getEntries(options as GuildSettingOptionsRepositoryData<BaseSettings>)) {
                if (option === undefined) {
                    continue;
                }

                const repository = this[repositoryKey as keyof this] as SettingsRepository<BaseSettings>;
                if (option instanceof EmojiGuildSettingOption) {
                    option.idStore.setRepository(repository);
                    option.nameStore.setRepository(repository);
                } else {
                    option.store.setKey(optionKey);
                    option.store.setRepository(repository);
                }

                this.#options.push(option);
            }
        }
    }

    /**
     * Defines a custom option for the module.
     *
     * @param data The data for the custom option.
     */
    defineCustom(data: BaseGuildSettingOptionData<CustomGuildSettingOption>): void {
        const option = new CustomGuildSettingOption(data);
        this.#options.push(option);
    }

    /**
     * Returns the configuration for the module.
     *
     * @returns The configuration for the module.
     */
    getConfig(): AnyGuildSettingOption[] {
        return this.#options;
    }
}
