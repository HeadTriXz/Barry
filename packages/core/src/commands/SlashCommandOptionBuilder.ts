import type { ApplicationCommandOption, ApplicationCommandOptionsRaw } from "./types.js";
import { ApplicationCommandOptionType } from "@discordjs/core";

/**
 * Provides utility methods for creating options for slash commands.
 */
export class SlashCommandOptionBuilder {
    /**
     * Creates options for a slash command with the "attachment" type.
     *
     * @param options The options to create.
     * @returns The created options.
     */
    static attachments(
        options: ApplicationCommandOption<ApplicationCommandOptionType.Attachment>
    ): ApplicationCommandOptionsRaw<ApplicationCommandOptionType.Attachment> {
        return SlashCommandOptionBuilder.#resolve(ApplicationCommandOptionType.Attachment, options);
    }

    /**
     * Creates options for a slash command with the "boolean" type.
     *
     * @param options The options to create.
     * @returns The created options.
     */
    static boolean(
        options: ApplicationCommandOption<ApplicationCommandOptionType.Boolean>
    ): ApplicationCommandOptionsRaw<ApplicationCommandOptionType.Boolean> {
        return SlashCommandOptionBuilder.#resolve(ApplicationCommandOptionType.Boolean, options);
    }

    /**
     * Creates options for a slash command with the "channel" type.
     *
     * @param options The options to create.
     * @returns The created options.
     */
    static channel(
        options: ApplicationCommandOption<ApplicationCommandOptionType.Channel>
    ): ApplicationCommandOptionsRaw<ApplicationCommandOptionType.Channel> {
        const option = SlashCommandOptionBuilder.#resolve(ApplicationCommandOptionType.Channel, options);

        if (options.channelTypes !== undefined) {
            option.channel_types = options.channelTypes;
        }

        return option;
    }

    /**
     * Creates options for a slash command with the "integer" type.
     *
     * @param options The options to create.
     * @returns The created options.
     */
    static integer(
        options: ApplicationCommandOption<ApplicationCommandOptionType.Integer>
    ): ApplicationCommandOptionsRaw<ApplicationCommandOptionType.Integer> {
        const option = SlashCommandOptionBuilder.#resolve(ApplicationCommandOptionType.Integer, options);

        if (options.maximum !== undefined) {
            option.max_value = options.maximum;
        }

        if (options.minimum !== undefined) {
            option.min_value = options.minimum;
        }

        return option;
    }

    /**
     * Creates options for a slash command with the "user" type. But returns the resolved member.
     *
     * @param options The options to create.
     * @returns The created options.
     */
    static member(
        options: ApplicationCommandOption<ApplicationCommandOptionType.User>
    ): ApplicationCommandOptionsRaw<ApplicationCommandOptionType.User> {
        const option = SlashCommandOptionBuilder.#resolve(ApplicationCommandOptionType.User, options);
        option.isMember = true;

        return option;
    }

    /**
     * Creates options for a slash command with the "mentionable" type.
     *
     * @param options The options to create.
     * @returns The created options.
     */
    static mentionable(
        options: ApplicationCommandOption<ApplicationCommandOptionType.Mentionable>
    ): ApplicationCommandOptionsRaw<ApplicationCommandOptionType.Mentionable> {
        return SlashCommandOptionBuilder.#resolve(ApplicationCommandOptionType.Mentionable, options);
    }

    /**
     * Creates options for a slash command with the "number" type.
     *
     * @param options The options to create.
     * @returns The created options.
     */
    static number(
        options: ApplicationCommandOption<ApplicationCommandOptionType.Number>
    ): ApplicationCommandOptionsRaw<ApplicationCommandOptionType.Number> {
        const option = SlashCommandOptionBuilder.#resolve(ApplicationCommandOptionType.Number, options);

        if (options.maximum !== undefined) {
            option.max_value = options.maximum;
        }

        if (options.minimum !== undefined) {
            option.min_value = options.minimum;
        }

        return option;
    }

    /**
     * Creates options for a slash command with the "role" type.
     *
     * @param options The options to create.
     * @returns The created options.
     */
    static role(
        options: ApplicationCommandOption<ApplicationCommandOptionType.Role>
    ): ApplicationCommandOptionsRaw<ApplicationCommandOptionType.Role> {
        return SlashCommandOptionBuilder.#resolve(ApplicationCommandOptionType.Role, options);
    }

    /**
     * Creates options for a slash command with the "string" type.
     *
     * @param options The options to create.
     * @returns The created options.
     */
    static string(
        options: ApplicationCommandOption<ApplicationCommandOptionType.String>
    ): ApplicationCommandOptionsRaw<ApplicationCommandOptionType.String> {
        const option = SlashCommandOptionBuilder.#resolve(ApplicationCommandOptionType.String, options);

        if (options.maximum !== undefined) {
            option.max_length = options.maximum;
        }

        if (options.minimum !== undefined) {
            option.min_length = options.minimum;
        }

        return option;
    }

    /**
     * Creates options for a slash command with the "user" type.
     *
     * @param options The options to create.
     * @returns The created options.
     */
    static user(
        options: ApplicationCommandOption<ApplicationCommandOptionType.User>
    ): ApplicationCommandOptionsRaw<ApplicationCommandOptionType.User> {
        return SlashCommandOptionBuilder.#resolve(ApplicationCommandOptionType.User, options);
    }

    /**
     * Resolves the given options for the specified command option type.
     *
     * @param type The type of command option to resolve.
     * @param options The options to resolve.
     * @return The resolved command options.
     * @private
     */
    static #resolve<T extends ApplicationCommandOptionType>(
        type: T,
        options: ApplicationCommandOption<T>
    ): ApplicationCommandOptionsRaw<T> {
        const option = {
            description: options.description,
            required: options.required,
            type: type
        } as ApplicationCommandOptionsRaw;

        if (options.autocomplete !== undefined) {
            if (options.choices?.length) {
                throw new Error("\"autocomplete\" may not be set if \"choices\" is present.");
            }

            option.autocomplete = options.autocomplete;
        }

        if (options.choices?.length) {
            option.choices = options.choices;
        }

        return option as ApplicationCommandOptionsRaw<T>;
    }
}
