import {
    type APIApplicationCommandBasicOption,
    type APIApplicationCommandOption,
    type APIApplicationCommandSubcommandGroupOption,
    type APIApplicationCommandSubcommandOption,
    type LocalizationMap,
    type RESTPostAPIApplicationCommandsJSONBody,
    ApplicationCommandOptionType,
    ApplicationCommandType
} from "@discordjs/core";
import { type ApplicationCommandOptions, BaseCommand } from "./BaseCommand.js";
import type { ConstructorArray, Module } from "../modules/Module.js";

import type { ApplicationCommandInteraction } from "../index.js";
import type { ApplicationCommandOptionsRaw } from "./types.js";

/**
 * Represents a subcommand option for an application command.
 * This can either be a regular subcommand option or a subcommand group option.
 */
type ApplicationCommandSubcommandOption =
    | APIApplicationCommandSubcommandOption
    | APIApplicationCommandSubcommandGroupOption;

/**
 * Options for a {@link SlashCommand}.
 */
export interface SlashCommandOptions extends ApplicationCommandOptions {
    /**
     * The subcommands of the command.
     */
    children?: ConstructorArray<SlashCommand>;

    /**
     * A description of the command.
     */
    description: string;

    /**
     * Localized versions of the description of the command.
     */
    descriptionLocalizations?: LocalizationMap;

    /**
     * Parameters for the command.
     */
    options?: Record<string, ApplicationCommandOptionsRaw>;
}

/**
 * Represents a slash command.
 * @abstract
 */
export abstract class SlashCommand<M extends Module = Module> extends BaseCommand<M> {
    /**
     * A collection of subcommands.
     */
    children: Map<string, SlashCommand<M>> = new Map();

    /**
     * The description of the command.
     */
    description: string;

    /**
     * Localized versions of the description of the command.
     */
    descriptionLocalizations?: LocalizationMap;

    /**
     * Parameters for the command.
     */
    options: ApplicationCommandOptionsRaw[] = [];

    /**
     * The type of application command.
     */
    type: ApplicationCommandType.ChatInput = ApplicationCommandType.ChatInput;

    /**
     * Represents a slash command.
     *
     * @param module The module this command belong to.
     * @param options Options for the command.
     */
    constructor(module: M, options: SlashCommandOptions) {
        super(module, options);

        this.description = options.description;
        this.descriptionLocalizations = options.descriptionLocalizations;

        if (Array.isArray(options.children)) {
            for (const CommandClass of options.children) {
                const instance = new CommandClass(module) as SlashCommand<M>;

                this.children.set(instance.name, instance);
            }
        } else if (options.children !== undefined) {
            options.children.then((children) => {
                for (const CommandClass of children) {
                    const instance = new CommandClass(module) as SlashCommand<M>;

                    this.children.set(instance.name, instance);
                }
            });
        }

        if (options.options !== undefined) {
            for (const key in options.options) {
                options.options[key].name = key;
                this.options.push(options.options[key]);
            }
        }
    }

    /**
     * Returns an array of command options including subcommands.
     */
    getOptions(): APIApplicationCommandOption[] {
        const options: APIApplicationCommandOption[] = [];

        if (this.children?.size) {
            for (const child of this.children.values()) {
                options.push({
                    description: child.description,
                    description_localizations: child.descriptionLocalizations,
                    name: child.name,
                    name_localizations: child.nameLocalizations,
                    options: child.getOptions(),
                    type: child.children?.size
                        ? ApplicationCommandOptionType.SubcommandGroup
                        : ApplicationCommandOptionType.Subcommand
                } as ApplicationCommandSubcommandOption);
            }
        }

        for (const option of this.options) {
            const o = { ...option, autocomplete: option.autocomplete !== undefined };
            delete o.isMember;

            options.push(o as APIApplicationCommandBasicOption);
        }

        return options;
    }

    /**
     * Returns an object with the properties required to register a new command.
     */
    toJSON(): RESTPostAPIApplicationCommandsJSONBody {
        const payload = super.toJSON();

        return Object.assign(payload, {
            description: this.description,
            description_localizations: this.descriptionLocalizations,
            options: this.getOptions()
        });
    }

    /**
     * Executes the slash command.
     *
     * @param interaction The interaction that triggered the command.
     * @param options The resolved options provided with the command.
     */
    abstract execute(
        interaction: ApplicationCommandInteraction,
        options: Record<string, any>
    ): Promise<void>;
}
