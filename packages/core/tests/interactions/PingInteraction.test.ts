import { type API, InteractionResponseType, InteractionType } from "@discordjs/core";

import { Client, PingInteraction } from "../../src/index.js";
import { mockPingInteraction } from "@barry-bot/testing";

describe("PingInteraction", () => {
    let client: Client;

    beforeEach(() => {
        client = new Client({
            applicationID: "49072635294295155",
            api: {} as API
        });
    });

    describe("constructor", () => {
        it("should should initialize the type property correctly", () => {
            const interaction = new PingInteraction( mockPingInteraction, client);
            expect(interaction.type).toBe(InteractionType.Ping);
        });
    });

    describe("pong", () => {
        it("should call the response handler if not already acknowledged", async () => {
            const respond = vi.fn();
            const interaction = new PingInteraction(mockPingInteraction, client, respond);

            await interaction.pong();

            expect(interaction.acknowledged).toBe(true);
            expect(respond).toHaveBeenCalledOnce();
            expect(respond).toHaveBeenCalledWith({
                body: {
                    type: InteractionResponseType.Pong
                }
            });
        });

        it("should throw an error if the interaction has already been acknowledged", async () => {
            const interaction = new PingInteraction(mockPingInteraction, client, vi.fn());
            interaction.acknowledged = true;

            await expect(() => interaction.pong()).rejects.toThrowError(
                "You have already acknowledged this interaction."
            );
        });
    });
});
