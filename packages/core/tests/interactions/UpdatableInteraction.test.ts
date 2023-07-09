import { type API, InteractionResponseType } from "@discordjs/core";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Client, UpdatableInteraction } from "../../src/index.js";
import { createMockModalSubmitInteraction } from "@barry/testing";

describe("UpdatableInteraction", () => {
    let client: Client;

    beforeEach(() => {
        client = new Client({
            applicationID: "49072635294295155",
            api: {
                webhooks: {
                    editMessage: vi.fn(() => Promise.resolve({
                        content: "Hello World",
                        id: "91256340920236565"
                    }))
                }
            } as unknown as API
        });
    });

    describe("deferUpdate", () => {
        it("should call the response handler if not already acknowledged", async () => {
            const respond = vi.fn();
            const data = createMockModalSubmitInteraction();
            const interaction = new UpdatableInteraction(data, client, respond);

            await interaction.deferUpdate();

            expect(interaction.acknowledged).toBe(true);
            expect(respond).toHaveBeenCalledOnce();
            expect(respond).toHaveBeenCalledWith({
                body: {
                    type: InteractionResponseType.DeferredMessageUpdate
                }
            });
        });

        it("should throw an error if the interaction has already been acknowledged", async () => {
            const data = createMockModalSubmitInteraction();
            const interaction = new UpdatableInteraction(data, client, vi.fn());
            interaction.acknowledged = true;

            await expect(() => interaction.deferUpdate()).rejects.toThrowError(
                "You have already acknowledged this interaction."
            );
        });
    });

    describe("editParent", () => {
        const messageOptions = {
            content: "Hello World"
        };

        it("should call the response handler if not already acknowledged", async () => {
            const respond = vi.fn();
            const data = createMockModalSubmitInteraction();
            const interaction = new UpdatableInteraction(data, client, respond);

            await interaction.editParent(messageOptions);

            expect(interaction.acknowledged).toBe(true);
            expect(respond).toHaveBeenCalledOnce();
            expect(respond).toHaveBeenCalledWith({
                body: {
                    type: InteractionResponseType.UpdateMessage,
                    data: messageOptions
                }
            });
        });

        it("should call editOriginalMessage if already acknowledged", async () => {
            const respond = vi.fn();
            const data = createMockModalSubmitInteraction();
            const interaction = new UpdatableInteraction(data, client, vi.fn());
            const editSpy = vi.spyOn(interaction, "editOriginalMessage");

            interaction.acknowledged = true;
            await interaction.editParent(messageOptions);

            expect(respond).not.toHaveBeenCalled();
            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith(messageOptions);
        });
    });
});
