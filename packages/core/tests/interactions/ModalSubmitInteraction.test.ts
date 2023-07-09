import { type API, InteractionType } from "@discordjs/core";

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
        it("should should initialize the data property correctly", () => {
            const data = createMockModalSubmitInteraction();
            const interaction = new ModalSubmitInteraction(data, client);

            expect(interaction.type).toBe(InteractionType.ModalSubmit);
            expect(interaction.data).toEqual({
                components: [],
                customID: "modal"
            });
        });
    });
});
