import {
    type API,
    InteractionType,
    InteractionResponseType
} from "@discordjs/core";

import { AutocompleteInteraction, Client } from "../../src/index.js";
import { createMockAutocompleteInteraction } from "@barry/testing";

describe("AutocompleteInteraction", () => {
    let client: Client;

    beforeEach(() => {
        client = new Client({
            applicationID: "49072635294295155",
            api: {} as API
        });
    });

    describe("constructor", () => {
        it("should should initialize the data property correctly", () => {
            const data = createMockAutocompleteInteraction();
            const interaction = new AutocompleteInteraction(data, client);

            expect(interaction.type).toBe(InteractionType.ApplicationCommandAutocomplete);
            expect(interaction.data.type).toBe(data.data.type);
            expect(interaction.data.name).toBe(data.data.name);
        });
    });

    describe("result", () => {
        it("should acknowledge the autocomplete interaction by sending a result with choices", async () => {
            const choices = [
                { name: "Choice 1", value: "choice1" },
                { name: "Choice 2", value: "choice2" }
            ];

            const respond = vi.fn();
            const data = createMockAutocompleteInteraction();
            const interaction = new AutocompleteInteraction(data, client, respond);

            await interaction.result(choices);

            expect(interaction.acknowledged).toBe(true);
            expect(respond).toHaveBeenCalledOnce();
            expect(respond).toHaveBeenCalledWith({
                body: {
                    type: InteractionResponseType.ApplicationCommandAutocompleteResult,
                    data: { choices }
                }
            });
        });

        it("should throw an error if the interaction has already been acknowledged", async () => {
            const data = createMockAutocompleteInteraction();
            const interaction = new AutocompleteInteraction(data, client, vi.fn());
            interaction.acknowledged = true;

            await expect(() => interaction.result([
                { name: "Choice 1", value: "choice1" },
                { name: "Choice 2", value: "choice2" }
            ])).rejects.toThrowError("You have already acknowledged this interaction.");
        });
    });
});
