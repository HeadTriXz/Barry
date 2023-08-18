import { type API, InteractionType, ComponentType } from "@discordjs/core";

import { beforeEach, describe, expect, it } from "vitest";
import { Client, ModalSubmitInteraction } from "../../src/index.js";
import { createMockModalSubmitInteraction } from "@barry/testing";

describe("ModalSubmitInteraction", () => {
    let client: Client;

    beforeEach(() => {
        client = new Client({
            applicationID: "49072635294295155",
            api: {} as API
        });
    });

    describe("constructor", () => {
        it("should initialize the data property correctly", () => {
            const data = createMockModalSubmitInteraction();
            const interaction = new ModalSubmitInteraction(data, client);

            expect(interaction.type).toBe(InteractionType.ModalSubmit);
            expect(interaction.data).toEqual({
                components: [],
                customID: "modal"
            });
        });

        it("should initialize the values property correctly", () => {
            const data = createMockModalSubmitInteraction({
                components: [
                    {
                        components: [{
                            custom_id: "foo",
                            type: ComponentType.TextInput,
                            value: "Hello"
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "bar",
                            type: ComponentType.TextInput,
                            value: "World"
                        }],
                        type: ComponentType.ActionRow
                    }
                ],
                custom_id: "modal"
            });
            const interaction = new ModalSubmitInteraction(data, client);

            expect(interaction.type).toBe(InteractionType.ModalSubmit);
            expect(interaction.values).toEqual({
                foo: "Hello",
                bar: "World"
            });
        });
    });
});
