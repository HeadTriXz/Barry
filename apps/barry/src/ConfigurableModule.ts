import type {
    BaseSettings,
    ModuleWithSettings,
    SettingsRepository
} from "./types/modules.js";
import { type UpdatableInteraction, Module } from "@barry/core";
import type { Application } from "./Application.js";
import type { ChannelType } from "@discordjs/core";

/**
 * Represents any guild setting option.
 */
export type AnyGuildSettingOption<T extends BaseSettings> = GuildSettingOptionMap<T>[keyof GuildSettingOptionMap<T>];

/**
 * Represents a boolean guild setting option.
 */
export type BooleanGuildSettingOption = BaseGuildSettingOption<GuildSettingType.Boolean>;

/**
 * Represents a custom guild setting option callback.
 */
export type CustomGuildSettingCallback<T extends BaseSettings> = (
    interaction: UpdatableInteraction,
    settings: T,
    originalHandler: () => Promise<void>
) => Promise<void>;

/**
 * The repositories for a module.
 */
export type FilteredRepositoryValues<T extends Module> = {
    [P in RepositoryKeys<T>]: RepositoryValues<T>[P];
};

/**
 * Represents a float guild setting option.
 */
export type FloatGuildSettingOption = GuildSettingOptionWithSize<GuildSettingType.Float>;

/**
 * Represents a guild setting option.
 */
export type GuildSettingOption<T extends GuildSettingType, U extends BaseSettings> = GuildSettingOptionMap<U>[T];

/**
 * Represents the configurable settings for a module.
 */
export type GuildSettingOptions<T extends Module> = {
    [P in RepositoryKeys<T>]?: {
        [K in keyof RepositoryValues<T>[P]]?: T[P] extends SettingsRepository<infer U>
            ? AnyGuildSettingOption<U>
            : never;
    };
};

/**
 * Represents an integer guild setting option.
 */
export type IntegerGuildSettingOption = GuildSettingOptionWithSize<GuildSettingType.Integer>;

/**
 * Represents the parsed configurable settings for a module.
 */
export type ParsedGuildSettingConfig<T extends Module> = Array<
    ParsedGuildSettingOption<T, GuildSettingType, BaseSettings>
>;

/**
 * The keys of the repositories for a module.
 */
export type RepositoryKeys<T extends Module> = {
    [P in keyof T]: T[P] extends SettingsRepository<BaseSettings> ? P : never;
}[keyof T];

/**
 * The values of the repositories for a module.
 */
export type RepositoryValues<T extends Module> = {
    [P in keyof T]: T[P] extends SettingsRepository<infer U> ? U : never;
};

/**
 * The repositories for a module.
 */
export type RepositoryEntity<T extends Module> = {
    [P in keyof T]: T[P] extends SettingsRepository<BaseSettings> ? T[P] : never;
}[keyof T];

/**
 * Represents a role guild setting option.
 */
export type RoleGuildSettingOption = BaseGuildSettingOption<GuildSettingType.Role>;

/**
 * Represents a role array guild setting option.
 */
export type RoleArrayGuildSettingOption = GuildSettingOptionWithSize<GuildSettingType.RoleArray>;

/**
 * Represents a string guild setting option.
 */
export type StringGuildSettingOption = GuildSettingOptionWithSize<GuildSettingType.String>;

/**
 * Represents a base guild setting option.
 */
export interface BaseGuildSettingOption<T extends GuildSettingType> {
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
     * The type of setting.
     */
    type: T;
}

/**
 * Represents a channel guild setting option.
 */
export interface ChannelGuildSettingOption extends BaseGuildSettingOption<GuildSettingType.Channel> {
    /**
     * The channel types that can be selected.
     */
    channelTypes?: ChannelType[];
}

/**
 * Represents a channel array guild setting option.
 */
export interface ChannelArrayGuildSettingOption extends GuildSettingOptionWithSize<GuildSettingType.ChannelArray> {
    /**
     * The channel types that can be selected.
     */
    channelTypes?: ChannelType[];
}

/**
 * Represents a custom guild setting option.
 */
export interface CustomGuildSettingOption<
    T extends BaseSettings
> extends BaseGuildSettingOption<GuildSettingType.Custom> {
    /**
     * The base handler to use for the setting.
     */
    base?: Exclude<GuildSettingType, GuildSettingType.Emoji | GuildSettingType.Enum>;

    /**
     * The callback to use for the setting.
     */
    callback: CustomGuildSettingCallback<T>;
}

/**
 * Represents an emoji guild setting option.
 */
export interface EmojiGuildSettingOption extends BaseGuildSettingOption<GuildSettingType.Emoji> {
    /**
     * The emoji keys for the setting.
     */
    emojiKeys: GuildSettingEmojiKeys;
}

/**
 * Represents an enum guild setting option.
 */
export interface EnumGuildSettingOption extends BaseGuildSettingOption<GuildSettingType.Enum> {
    /**
     * The possible values for the setting.
     */
    values: string[];
}

/**
 * Represents the keys of an emoji.
 */
export interface GuildSettingEmojiKeys {
    /**
     * The key for the emoji's ID.
     */
    id: string;

    /**
     * The key for the emoji's name.
     */
    name: string;
}

/**
 * Represents the options for a guild setting.
 */
export interface GuildSettingOptionMap<T extends BaseSettings> {
    [GuildSettingType.Boolean]: BooleanGuildSettingOption;
    [GuildSettingType.Channel]: ChannelGuildSettingOption;
    [GuildSettingType.ChannelArray]: ChannelArrayGuildSettingOption;
    [GuildSettingType.Custom]: CustomGuildSettingOption<T>;
    [GuildSettingType.Emoji]: EmojiGuildSettingOption;
    [GuildSettingType.Enum]: EnumGuildSettingOption;
    [GuildSettingType.Float]: FloatGuildSettingOption;
    [GuildSettingType.Integer]: IntegerGuildSettingOption;
    [GuildSettingType.Role]: RoleGuildSettingOption;
    [GuildSettingType.RoleArray]: RoleArrayGuildSettingOption;
    [GuildSettingType.String]: StringGuildSettingOption;
}

/**
 * Represents a guild setting option with a minimum and maximum size.
 */
export interface GuildSettingOptionWithSize<T extends GuildSettingType> extends BaseGuildSettingOption<T> {
    /**
     * The maximum size of the value.
     */
    maximum?: number;

    /**
     * The minimum size of the value.
     */
    minimum?: number;
}

/**
 * Represents a parsed setting option.
 */
export type ParsedGuildSettingOption<
    M extends Module,
    T extends GuildSettingType,
    U extends BaseSettings,
    K extends keyof U = keyof U
> = GuildSettingOption<T, U> & {
    /**
     * The key of the setting.
     */
    key: K;

    /**
     * The repository for the setting.
     */
    repository: RepositoryEntity<M>;
};

/**
 * Represents the type of a setting.
 */
export enum GuildSettingType {
    Boolean,
    Channel,
    ChannelArray,
    Custom,
    Emoji,
    Enum,
    Float,
    Integer,
    Role,
    RoleArray,
    String
}

/**
 * Represents a module that can be configured.
 */
export abstract class ConfigurableModule<
    T extends BaseSettings,
    M extends Module = ModuleWithSettings<T>
> extends Module<Application> implements ModuleWithSettings<T> {
    /**
     * The configuration for the module.
     */
    #config: GuildSettingOptions<M> = {};

    /**
     * The settings repository for the module.
     */
    abstract settings: SettingsRepository<T>;

    /**
     * Defines the configuration for the module.
     *
     * @param config The configuration for the module.
     */
    defineConfig(config: GuildSettingOptions<M>): void {
        this.#config = config;
    }

    /**
     * Returns the configuration for the module.
     *
     * @returns The configuration for the module.
     */
    getConfig(): ParsedGuildSettingConfig<M> {
        const config: ParsedGuildSettingConfig<M> = [];
        for (const repository in this.#config) {
            const options = this.#config[repository as RepositoryKeys<M>];
            if (options === undefined) {
                continue;
            }

            for (const key in options) {
                config.push({
                    ...options[key],
                    key: key,
                    repository: this[repository as keyof this]
                } as ParsedGuildSettingOption<M, GuildSettingType, BaseSettings>);
            }
        }

        return config;
    }
}

/**
 * Represents a builder for setting options.
 */
export class GuildSettingOptionBuilder {
    /**
     * Creates a new boolean setting option.
     *
     * @param data The data for the setting option.
     * @returns The setting option.
     */
    static boolean(data: Omit<BooleanGuildSettingOption, "type">): BooleanGuildSettingOption {
        return { ...data, type: GuildSettingType.Boolean };
    }

    /**
     * Creates a new channel setting option.
     *
     * @param data The data for the setting option.
     * @returns The setting option.
     */
    static channel(data: Omit<ChannelGuildSettingOption, "type">): ChannelGuildSettingOption {
        return { ...data, type: GuildSettingType.Channel };
    }

    /**
     * Creates a new channel array setting option.
     *
     * @param data The data for the setting option.
     * @returns The setting option.
     */
    static channelArray(data: Omit<ChannelArrayGuildSettingOption, "type">): ChannelArrayGuildSettingOption {
        return { ...data, type: GuildSettingType.ChannelArray };
    }

    /**
     * Creates a new custom setting option.
     *
     * @param data The data for the setting option.
     * @returns The setting option.
     */
    static custom<T extends BaseSettings>(
        data: Omit<CustomGuildSettingOption<T>, "type">
    ): CustomGuildSettingOption<T> {
        return { ...data, type: GuildSettingType.Custom };
    }

    /**
     * Creates a new emoji setting option.
     *
     * @param data The data for the setting option.
     * @returns The setting option.
     */
    static emoji(data: Omit<EmojiGuildSettingOption, "type">): EmojiGuildSettingOption {
        return { ...data, type: GuildSettingType.Emoji };
    }

    /**
     * Creates a new enum setting option.
     *
     * @param data The data for the setting option.
     * @returns The setting option.
     */
    static enum(data: Omit<EnumGuildSettingOption, "type">): EnumGuildSettingOption {
        return { ...data, type: GuildSettingType.Enum };
    }

    /**
     * Creates a new float setting option.
     *
     * @param data The data for the setting option.
     * @returns The setting option.
     */
    static float(data: Omit<FloatGuildSettingOption, "type">): FloatGuildSettingOption {
        return { ...data, type: GuildSettingType.Float };
    }

    /**
     * Creates a new integer setting option.
     *
     * @param data The data for the setting option.
     * @returns The setting option.
     */
    static integer(data: Omit<IntegerGuildSettingOption, "type">): IntegerGuildSettingOption {
        return { ...data, type: GuildSettingType.Integer };
    }

    /**
     * Creates a new role setting option.
     *
     * @param data The data for the setting option.
     * @returns The setting option.
     */
    static role(data: Omit<RoleGuildSettingOption, "type">): RoleGuildSettingOption {
        return { ...data, type: GuildSettingType.Role };
    }

    /**
     * Creates a new role array setting option.
     *
     * @param data The data for the setting option.
     * @returns The setting option.
     */
    static roleArray(data: Omit<RoleArrayGuildSettingOption, "type">): RoleArrayGuildSettingOption {
        return { ...data, type: GuildSettingType.RoleArray };
    }

    /**
     * Creates a new string setting option.
     *
     * @param data The data for the setting option.
     * @returns The setting option.
     */
    static string(data: Omit<StringGuildSettingOption, "type">): StringGuildSettingOption {
        return { ...data, type: GuildSettingType.String };
    }
}
