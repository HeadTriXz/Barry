import { MockAgent, setGlobalDispatcher } from "undici";

import { ApplicationCommandInteraction } from "@barry/core";
import { MessageFlags } from "@discordjs/core";
import { createMockApplication } from "../../../../../../mocks/application.js";
import { createMockApplicationCommandInteraction } from "@barry/testing";

import ConvertCurrencyCommand from "../../../../../../../src/modules/general/commands/chatinput/convert/currency/index.js";
import GeneralModule from "../../../../../../../src/modules/general/index.js";

describe("/convert currency", () => {
    let command: ConvertCurrencyCommand;
    let interaction: ApplicationCommandInteraction;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new GeneralModule(client);
        command = new ConvertCurrencyCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client, vi.fn());
        interaction.createMessage = vi.fn();
    });

    describe("execute", () => {
        it("should send the converted amount", async () => {
            vi.spyOn(command, "isValidCurrency").mockReturnValue(true);
            vi.spyOn(command, "fetchRate").mockResolvedValue(0.82);

            await command.execute(interaction, {
                amount: 1,
                from: "USD",
                to: "EUR"
            });

            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                content: expect.stringContaining("`1 USD` is `0.82 EUR`.")
            });
        });

        it("should send an error message if the 'from' currency is invalid", async () => {
            vi.spyOn(command, "isValidCurrency").mockReturnValue(false);

            await command.execute(interaction, {
                amount: 1,
                from: "invalid",
                to: "USD"
            });

            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                content: expect.stringContaining("`invalid` is not a valid currency."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should send an error message if the 'to' currency is invalid", async () => {
            vi.spyOn(command, "isValidCurrency")
                .mockReturnValueOnce(true)
                .mockReturnValue(false);

            await command.execute(interaction, {
                amount: 1,
                from: "USD",
                to: "invalid"
            });

            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                content: expect.stringContaining("`invalid` is not a valid currency."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should send an error message if the 'from' and 'to' currencies are the same", async () => {
            vi.spyOn(command, "isValidCurrency").mockReturnValue(true);

            await command.execute(interaction, {
                amount: 1,
                from: "USD",
                to: "USD"
            });

            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                content: expect.stringContaining("You can't convert from and to the same currency."),
                flags: MessageFlags.Ephemeral
            });
        });
    });

    describe("fetchRate", () => {
        beforeEach(() => {
            const agent = new MockAgent();
            agent
                .get("https://api.frankfurter.app")
                .intercept({
                    path: "/latest",
                    query: {
                        amount: 1,
                        from: "USD",
                        to: "EUR"
                    }
                })
                .reply(200, {
                    amount: 1,
                    base: "USD",
                    date: "01-01-2023",
                    rates: {
                        EUR: 0.82
                    }
                });

            setGlobalDispatcher(agent);
        });

        it("should fetch the rate for the given currency", async () => {
            const result = await command.fetchRate(1, "USD", "EUR");

            expect(result).toBe(0.82);
        });
    });

    describe("isValidCurrency", () => {
        it("should return true if the currency is valid", () => {
            const result = command.isValidCurrency("USD");

            expect(result).toBe(true);
        });

        it("should return false if the currency is invalid", () => {
            const result = command.isValidCurrency("invalid");

            expect(result).toBe(false);
        });
    });

    describe("predictCurrency", () => {
        it("should find the matching currencies for a name", () => {
            const result = command.predictCurrency("Euro");

            expect(result).toEqual([{
                name: "Euro",
                value: "EUR"
            }]);
        });

        it("should find the matching currencies for a symbol", () => {
            const result = command.predictCurrency("€");

            expect(result).toEqual([{
                name: "Euro",
                value: "EUR"
            }]);
        });

        it("should find the matching currencies for a code", () => {
            const result = command.predictCurrency("EUR");

            expect(result).toEqual([{
                name: "Euro",
                value: "EUR"
            }]);
        });

        it("should find the matching currencies for a lowercase name", () => {
            const result = command.predictCurrency("euro");

            expect(result).toEqual([{
                name: "Euro",
                value: "EUR"
            }]);
        });

        it("should find the matching currencies for an incomplete name", () => {
            const result = command.predictCurrency("dollar");

            expect(result).toEqual([
                {
                    name: "Australian Dollar",
                    value: "AUD"
                },
                {
                    name: "Canadian Dollar",
                    value: "CAD"
                },
                {
                    name: "Hong Kong Dollar",
                    value: "HKD"
                },
                {
                    name: "New Zealand Dollar",
                    value: "NZD"
                },
                {
                    name: "Singapore Dollar",
                    value: "SGD"
                },
                {
                    name: "United States Dollar",
                    value: "USD"
                }
            ]);
        });
    });
});
