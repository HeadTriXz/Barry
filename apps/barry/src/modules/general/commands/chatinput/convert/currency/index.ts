import { type APIApplicationCommandOptionChoice, MessageFlags } from "@discordjs/core";
import { type ApplicationCommandInteraction, SlashCommand, SlashCommandOptionBuilder } from "@barry-bot/core";
import type GeneralModule from "../../../../index.js";

import { fetch } from "undici";
import config from "../../../../../../config.js";

/**
 * Represents the options for the "/convert currency" command.
 */
export interface CurrencyOptions {
    /**
     * The amount to convert.
     */
    amount: number;

    /**
     * The currency to convert from.
     */
    from: string;

    /**
     * The currency to convert to.
     */
    to: string;
}

/**
 * Represents the result of the API request.
 */
export interface CurrencyResult {
    /**
     * The amount that was converted.
     */
    amount: number;

    /**
     * The currency that was converted from.
     */
    base: string;

    /**
     * The date the data was last updated.
     */
    date: string;

    /**
     * The rates for each currency.
     */
    rates: Record<string, number>;
}

/**
 * Represents the names of each currency.
 */
const currencyNames: Record<string, string> = {
    "AUD": "Australian Dollar",
    "BGN": "Bulgarian Lev",
    "BRL": "Brazilian Real",
    "CAD": "Canadian Dollar",
    "CHF": "Swiss Franc",
    "CNY": "Chinese Renminbi Yuan",
    "CZK": "Czech Koruna",
    "DKK": "Danish Krone",
    "EUR": "Euro",
    "GBP": "British Pound",
    "HKD": "Hong Kong Dollar",
    "HUF": "Hungarian Forint",
    "IDR": "Indonesian Rupiah",
    "ILS": "Israeli New Sheqel",
    "INR": "Indian Rupee",
    "ISK": "Icelandic Króna",
    "JPY": "Japanese Yen",
    "KRW": "South Korean Won",
    "MXN": "Mexican Peso",
    "MYR": "Malaysian Ringgit",
    "NOK": "Norwegian Krone",
    "NZD": "New Zealand Dollar",
    "PHP": "Philippine Peso",
    "PLN": "Polish Złoty",
    "RON": "Romanian Leu",
    "SEK": "Swedish Krona",
    "SGD": "Singapore Dollar",
    "THB": "Thai Baht",
    "TRY": "Turkish Lira",
    "USD": "United States Dollar",
    "ZAR": "South African Rand"
};

/**
 * Represents the aliases of each currency.
 */
const currencyAliases: Record<string, string[]> = {
    "AUD": ["A$", "AU$", "AUS$", "AUS $"],
    "BGN": ["ЛВ"],
    "BRL": ["R$"],
    "CAD": ["C$", "CA$", "CAN$", "CAN $"],
    "CHF": ["FR", "SFR", "CHF"],
    "CNY": ["¥", "CN¥", "CN ¥"],
    "CZK": ["KČ"],
    "DKK": ["KR"],
    "EUR": ["€"],
    "GBP": ["£"],
    "HKD": ["HK$", "HKD"],
    "HUF": ["FT"],
    "IDR": ["RP"],
    "ILS": ["₪"],
    "INR": ["₹"],
    "ISK": ["KR"],
    "JPY": ["¥", "JP¥", "JP ¥", "YEN", "圓", "円"],
    "KRW": ["₩"],
    "MXN": ["MEX$", "MEX $"],
    "MYR": ["RM"],
    "NOK": ["KR"],
    "NZD": ["NZ$", "NZD"],
    "PHP": ["₱"],
    "PLN": ["ZŁ"],
    "RON": ["LEI"],
    "SEK": ["KR"],
    "SGD": ["S$", "SGD"],
    "THB": ["฿"],
    "TRY": ["₺"],
    "USD": ["$", "US$", "US $"],
    "ZAR": ["R"]
};

/**
 * Represents a slash command for converting currency.
 */
export default class extends SlashCommand<GeneralModule> {
    /**
     * Represents a slash command for converting currency.
     *
     * @param module The module this command belongs to.
     */
    constructor(module: GeneralModule) {
        super(module, {
            name: "currency",
            description: "Converts currency from one to another.",
            options: {
                amount: SlashCommandOptionBuilder.number({
                    description: "The amount to convert.",
                    minimum: 0,
                    required: true
                }),
                from: SlashCommandOptionBuilder.string({
                    description: "The currency to convert from.",
                    required: true,
                    autocomplete: (value) => this.predictCurrency(value)
                }),
                to: SlashCommandOptionBuilder.string({
                    description: "The currency to convert to.",
                    required: true,
                    autocomplete: (value) => this.predictCurrency(value)
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
    async execute(interaction: ApplicationCommandInteraction, options: CurrencyOptions): Promise<void> {
        options.from = options.from.toUpperCase();
        options.to = options.to.toUpperCase();

        if (!this.isValidCurrency(options.from)) {
            return interaction.createMessage({
                content: `${config.emotes.error} \`${options.from}\` is not a valid currency.`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (!this.isValidCurrency(options.to)) {
            return interaction.createMessage({
                content: `${config.emotes.error} \`${options.to}\` is not a valid currency.`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (options.from === options.to) {
            return interaction.createMessage({
                content: `${config.emotes.error} You can't convert from and to the same currency.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const rate = await this.fetchRate(options.amount, options.from, options.to);
        await interaction.createMessage({
            content: `${config.emotes.add} \`${options.amount} ${options.from}\` is \`${rate} ${options.to}\`.`
        });
    }

    /**
     * Fetches the rate for the given currency.
     *
     * @param amount The amount to convert.
     * @param from The currency to convert from.
     * @param to The currency to convert to.
     * @returns The rate for the given currency.
     */
    async fetchRate(amount: number, from: string, to: string): Promise<number> {
        const url = new URL("https://api.frankfurter.app/latest");
        url.searchParams.append("amount", amount.toString());
        url.searchParams.append("from", from);
        url.searchParams.append("to", to);

        return fetch(url, { method: "GET" })
            .then((response) => response.json() as Promise<CurrencyResult>)
            .then((data) => data.rates[to]);
    }

    /**
     * Checks if the given currency is valid.
     *
     * @param currency The currency to check.
     * @returns Whether the given currency is valid.
     */
    isValidCurrency(currency: string): boolean {
        return currency in currencyNames;
    }

    /**
     * Predicts the currency from the given value.
     *
     * @param currency The currency to predict.
     * @returns The predicted currency.
     */
    predictCurrency(currency: string): Array<APIApplicationCommandOptionChoice<string>> {
        const cleaned = currency.toUpperCase().replace(".", "");
        if (cleaned in currencyNames) {
            return [{ name: currencyNames[cleaned], value: cleaned }];
        }

        const result = [];
        for (const [key, aliases] of Object.entries(currencyAliases)) {
            if (aliases.some((a) => a.includes(cleaned)) || currencyNames[key].toUpperCase().includes(cleaned)) {
                result.push({ name: currencyNames[key], value: key });
            }
        }

        return result.slice(0, 25);
    }
}
