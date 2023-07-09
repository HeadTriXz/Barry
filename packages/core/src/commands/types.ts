import type {
    APIApplicationCommandOptionChoice,
    ApplicationCommandOptionType,
    ChannelType,
    LocalizationMap
} from "@discordjs/core";
import type { AutocompleteInteraction } from "../index.js";
import type { Awaitable } from "../types.js";

/**
 * Represents a command option for an application command.
 * This can either have autocomplete interactions enabled or have choices for the user to pick from.
 */
export type ApplicationCommandOption<T extends ApplicationCommandOptionType = ApplicationCommandOptionType>
    = ApplicationCommandOptionWithAutocomplete<T> | ApplicationCommandOptionWithChoices<T>;

/**
 * Represents a callback function used for autocomplete interactions.
 */
export type AutocompleteCallback<T = string | number> =
    (value: T, interaction: AutocompleteInteraction) =>
        Awaitable<Array<ApplicationCommandOptionChoice<T>>>;

/**
 * Represents a command option.
 */
export interface ApplicationCommandOptionBase<T extends ApplicationCommandOptionType = ApplicationCommandOptionType> {
    /**
     * The channels shown will be restricted to these types.
     */
    channelTypes?: T extends ApplicationCommandOptionType.Channel
        ? ChannelType[]
        : never;

    /**
     * The description of the option. (1-100 characters)
     */
    description: string;

    /**
     * Maximum value or length.
     */
    maximum?: T extends ApplicationCommandOptionType.String
        | ApplicationCommandOptionType.Integer
        | ApplicationCommandOptionType.Number
        ? number
        : never;

    /**
     * Minimum value or length.
     */
    minimum?: T extends ApplicationCommandOptionType.String
        | ApplicationCommandOptionType.Integer
        | ApplicationCommandOptionType.Number
        ? number
        : never;

    /**
     * Whether this option is required.
     */
    required?: boolean;
}

/**
 * Represents a raw application command option.
 */
interface ApplicationCommandOptionsBase<
    T extends ApplicationCommandOptionType = ApplicationCommandOptionType
> {
    channel_types?: T extends ApplicationCommandOptionType.Channel
        ? ChannelType[]
        : never;

    /**
     * Choices for the user to pick from.
     */
    choices?: T extends ApplicationCommandOptionType.String
        ? Array<APIApplicationCommandOptionChoice<string>>
        : T extends ApplicationCommandOptionType.Integer | ApplicationCommandOptionType.Number
            ? Array<APIApplicationCommandOptionChoice<number>>
            : never;

    /**
     * The description of the option. (1-100 characters)
     */
    description: string;

    /**
     * Maximum length of a string.
     */
    max_length?: T extends ApplicationCommandOptionType.String
        ? number
        : never;

    /**
     * Maximum value of a number or integer.
     */
    max_value?: T extends ApplicationCommandOptionType.Integer | ApplicationCommandOptionType.Number
        ? number
        : never;

    /**
     * Minimum length of a string.
     */
    min_length?: T extends ApplicationCommandOptionType.String
        ? number
        : never;

    /**
     * Minimum value of a number or string.
     */
    min_value?: T extends ApplicationCommandOptionType.Integer | ApplicationCommandOptionType.Number
        ? number
        : never;

    /**
     * The name of the parameter.
     */
    name: string;

    /**
     * Whether this option is required.
     */
    required?: boolean;

    /**
     * The type of option.
     */
    type: T;
}

/**
 * Represents a raw application command option.
 */
export interface ApplicationCommandOptionsRaw<
    T extends ApplicationCommandOptionType = ApplicationCommandOptionType
> extends ApplicationCommandOptionsBase<T> {
    /**
     * Callback for autocomplete interactions.
     */
    autocomplete?: T extends ApplicationCommandOptionType.String
        ? AutocompleteCallback<string>
        : T extends ApplicationCommandOptionType.Integer | ApplicationCommandOptionType.Number
            ? AutocompleteCallback<number>
            : never;

    /**
     * Whether to return the resolved member.
     */
    isMember?: boolean;
}

/**
 * Represents a command option with autocomplete interactions enabled.
 */
export interface ApplicationCommandOptionWithAutocomplete<
    T extends ApplicationCommandOptionType = ApplicationCommandOptionType
> extends ApplicationCommandOptionBase {
    /**
     * Callback for autocomplete interactions.
     */
    autocomplete?: T extends ApplicationCommandOptionType.String
        ? AutocompleteCallback<string>
        : T extends ApplicationCommandOptionType.Integer | ApplicationCommandOptionType.Number
            ? AutocompleteCallback<number>
            : never;

    /**
     * Choices for the user to pick from.
     */
    choices?: never;
}

/**
 * Represents an application command option with options.
 */
export interface ApplicationCommandOptionWithOptions {
    /**
     * Whether the option is focused.
     */
    focused?: boolean;

    /**
     * The name of the option.
     */
    name: string;

    /**
     * The nested options of the option.
     */
    options?: ApplicationCommandOptionWithOptions[];

    /**
     * The type of the option.
     */
    type: number;

    /**
     * The value of the option.
     */
    value?: unknown;
}

/**
 * Represents a choice for an application command option.
 */
export interface ApplicationCommandOptionChoice<T = string | number> {
    /**
     * The name of the choice.
     */
    name: string;

    /**
     * Localized versions of the name of the choice.
     */
    nameLocalizations?: LocalizationMap | null;

    /**
     * The value of the choice.
     */
    value: T;
}

/**
 * Represents a command option with choices for the user to pick from.
 */
export interface ApplicationCommandOptionWithChoices<
    T extends ApplicationCommandOptionType = ApplicationCommandOptionType
> extends ApplicationCommandOptionBase {
    /**
     * Callback for autocomplete interactions.
     */
    autocomplete?: never;

    /**
     * Choices for the user to pick from.
     */
    choices?: T extends ApplicationCommandOptionType.String
        ? Array<ApplicationCommandOptionChoice<string>>
        : T extends ApplicationCommandOptionType.Integer | ApplicationCommandOptionType.Number
            ? Array<ApplicationCommandOptionChoice<number>>
            : never;
}
