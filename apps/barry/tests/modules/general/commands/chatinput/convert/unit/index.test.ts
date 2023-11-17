import { ApplicationCommandInteraction, AutocompleteInteraction } from "@barry/core";
import { ApplicationCommandOptionType, MessageFlags } from "@discordjs/core";
import {
    createMockApplicationCommandInteraction,
    createMockAutocompleteInteraction,
    mockAutocompleteCommand
} from "@barry/testing";
import { createMockApplication } from "../../../../../../mocks/application.js";

import ConvertUnitCommand from "../../../../../../../src/modules/general/commands/chatinput/convert/unit/index.js";
import GeneralModule from "../../../../../../../src/modules/general/index.js";

describe("/convert unit", () => {
    let command: ConvertUnitCommand;
    let interaction: ApplicationCommandInteraction;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new GeneralModule(client);
        command = new ConvertUnitCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client, vi.fn());
        interaction.createMessage = vi.fn();
    });

    describe("execute", () => {
        it("should send the converted amount", async () => {
            vi.spyOn(command, "isValidUnit").mockReturnValue(true);

            await command.execute(interaction, {
                amount: 1,
                from: "km",
                to: "m"
            });

            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                content: expect.stringContaining("`1 km` is `1000 m`.")
            });
        });

        it("should send an error message if the 'from' unit is invalid", async () => {
            vi.spyOn(command, "isValidUnit").mockReturnValue(false);

            await command.execute(interaction, {
                amount: 1,
                from: "invalid",
                to: "m"
            });

            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                content: expect.stringContaining("`invalid` is not a valid unit."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should send an error message if the 'to' unit is invalid", async () => {
            vi.spyOn(command, "isValidUnit")
                .mockReturnValueOnce(true)
                .mockReturnValue(false);

            await command.execute(interaction, {
                amount: 1,
                from: "km",
                to: "invalid"
            });

            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                content: expect.stringContaining("`invalid` is not a valid unit."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should send an error message if the 'from' and 'to' currencies are the same", async () => {
            vi.spyOn(command, "isValidUnit").mockReturnValue(true);

            await command.execute(interaction, {
                amount: 1,
                from: "km",
                to: "km"
            });

            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                content: expect.stringContaining("You can't convert from and to the same unit."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should send an error message if the 'from' and 'to' units are not the same type", async () => {
            vi.spyOn(command, "isValidUnit").mockReturnValue(true);

            await command.execute(interaction, {
                amount: 1,
                from: "km",
                to: "kg"
            });

            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                content: expect.stringContaining("You can't convert from `Kilometers` to `Kilograms`."),
                flags: MessageFlags.Ephemeral
            });
        });
    });

    describe("isValidUnit", () => {
        it("should return true if the unit is valid", () => {
            expect(command.isValidUnit("km")).toBe(true);
        });

        it("should return false if the unit is invalid", () => {
            expect(command.isValidUnit("invalid")).toBe(false);
        });
    });

    describe("predictUnit", () => {
        let autocompleteInteraction: AutocompleteInteraction;

        beforeEach(() => {
            const data = createMockAutocompleteInteraction({
                ...mockAutocompleteCommand,
                options: [{
                    name: "unit",
                    options: [{
                        name: "from",
                        type: ApplicationCommandOptionType.String,
                        value: "km"
                    }],
                    type: ApplicationCommandOptionType.Subcommand
                }]
            });
            autocompleteInteraction = new AutocompleteInteraction(data, interaction.client, vi.fn());
        });

        it("should return a list of units that match the given value", () => {
            const result = command.predictUnit("milligr", autocompleteInteraction, "to");

            expect(result).toEqual([{
                name: "Milligrams (mg)",
                value: "mg"
            }]);
        });

        it("should return the full list of units if no value is given", () => {
            const result = command.predictUnit("", autocompleteInteraction, "to");

            expect(result.length).toBe(25);
        });

        it("should return an empty array if no units match the given value", () => {
            const result = command.predictUnit("invalid", autocompleteInteraction, "to");
            expect(result).toEqual([]);
        });

        it("should only return units of the same type as the 'from' unit", () => {
            const result = command.predictUnit("m", autocompleteInteraction, "from");

            expect(result).not.toContainEqual({
                name: "Milligrams (mg)",
                value: "mg"
            });
        });
    });
});
