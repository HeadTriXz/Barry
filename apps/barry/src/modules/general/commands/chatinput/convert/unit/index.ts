import {
    type APIApplicationCommandOptionChoice,
    ApplicationIntegrationType,
    MessageFlags
} from "@discordjs/core";
import {
    type ApplicationCommandInteraction,
    type AutocompleteInteraction,
    SlashCommand,
    SlashCommandOptionBuilder
} from "@barry-bot/core";
import type GeneralModule from "../../../../index.js";

import convert, { type Unit } from "convert-units";
import config from "../../../../../../config.js";

/**
 * Represents an application command option with options.
 */
export interface ApplicationCommandOptionWithOptions {
    /**
     * The type of the option.
     */
    name: string;

    /**
     * The nested options of the option.
     */
    options?: ApplicationCommandOptionWithOptions[];

    /**
     * The value of the option.
     */
    value?: unknown;
}

/**
 * Represents the options for the "/convert unit" command.
 */
export interface UnitOptions {
    /**
     * The amount to convert.
     */
    amount: number;

    /**
     * The unit to convert from.
     */
    from: string;

    /**
     * The unit to convert to.
     */
    to: string;
}

/**
 * Represents a slash command for converting one unit to another.
 */
export default class extends SlashCommand<GeneralModule> {
    /**
     * Represents a slash command for converting one unit to another.
     *
     * @param module The module this command belongs to.
     */
    constructor(module: GeneralModule) {
        super(module, {
            name: "unit",
            description: "Converts one unit to another.",
            integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
            options: {
                amount: SlashCommandOptionBuilder.number({
                    description: "The amount to convert.",
                    minimum: 0,
                    required: true
                }),
                from: SlashCommandOptionBuilder.string({
                    description: "The unit to convert from.",
                    required: true,
                    autocomplete: (value, interaction) => this.predictUnit(value, interaction, "to")
                }),
                to: SlashCommandOptionBuilder.string({
                    description: "The unit to convert to.",
                    required: true,
                    autocomplete: (value, interaction) => this.predictUnit(value, interaction, "from")
                })
            }
        });
    }

    /**
     * Sends a message with the result of the conversion.
     *
     * @param interaction The interaction that triggered this command.
     * @param options The options for this command.
     */
    async execute(interaction: ApplicationCommandInteraction, options: UnitOptions): Promise<void> {
        if (!this.isValidUnit(options.from)) {
            return interaction.createMessage({
                content: `${config.emotes.error} \`${options.from}\` is not a valid unit.`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (!this.isValidUnit(options.to)) {
            return interaction.createMessage({
                content: `${config.emotes.error} \`${options.to}\` is not a valid unit.`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (options.from === options.to) {
            return interaction.createMessage({
                content: `${config.emotes.error} You can't convert from and to the same unit.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const fromDescription = convert().describe(options.from);
        const toDescription = convert().describe(options.to);
        if (fromDescription.measure !== toDescription.measure) {
            return interaction.createMessage({
                content: `${config.emotes.error} You can't convert from \`${fromDescription.plural}\` to \`${toDescription.plural}\`.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const result = convert(options.amount)
            .from(options.from)
            .to(options.to);

        await interaction.createMessage({
            content: `${config.emotes.add} \`${options.amount} ${options.from}\` is \`${result} ${options.to}\`.`
        });
    }

    /**
     * Gets the filled option from the given interaction.
     *
     * @param data The data of the interaction.
     * @returns The focused option.
     */
    getOptionValue(name: string, options: ApplicationCommandOptionWithOptions): string | undefined {
        if (options.options === undefined) {
            return;
        }

        for (const option of options.options) {
            if (option.name === name) {
                return option.value as string;
            }

            const value = this.getOptionValue(name, option);
            if (value !== undefined) {
                return value;
            }
        }
    }

    /**
     * Checks whether the given value is a valid unit.
     *
     * @param value The value to check.
     * @returns Whether the given value is a valid unit.
     */
    isValidUnit(value: string): value is Unit {
        return convert().getUnit(value as Unit) !== undefined;
    }

    /**
     * Predicts the unit for the given value.
     *
     * @param value The value to predict a unit for.
     * @param interaction The interaction that triggered this autocomplete.
     * @param other The other unit to predict for.
     * @returns The predicted units.
     */
    predictUnit(
        value: string,
        interaction: AutocompleteInteraction,
        other: "from" | "to"
    ): Array<APIApplicationCommandOptionChoice<Unit>> {
        const option = this.getOptionValue(other, interaction.data);
        const cleaned = value.toLowerCase();

        const units = option !== undefined && this.isValidUnit(option)
            ? convert().from(option).possibilities()
            : convert().possibilities();

        const results = [];
        for (const unit of units) {
            const description = convert().describe(unit);
            const isMatch = description.abbr.toLowerCase().includes(cleaned)
                || description.singular.toLowerCase().includes(cleaned)
                || description.plural.toLowerCase().includes(cleaned);

            if (isMatch) {
                results.push({
                    name: `${description.plural} (${unit})`,
                    value: unit
                });
            }
        }

        return results.slice(0, 25);
    }
}
