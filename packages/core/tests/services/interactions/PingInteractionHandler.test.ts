import { beforeEach, describe, expect, it, vi } from "vitest";
import { PingInteraction, PingInteractionHandler } from "../../../src/index.js";

import { InteractionResponseType } from "@discordjs/core";
import { mockPingInteraction } from "@barry/testing";

describe("PingInteractionHandler", () => {
    let handler: PingInteractionHandler;

    beforeEach(() => {
        handler = new PingInteractionHandler();
    });

    describe("handle", () => {
        it("should acknowledge the ping", async () => {
            const respond = vi.fn();
            const interaction = new PingInteraction(mockPingInteraction, undefined, respond);

            await handler.handle(interaction);

            expect(respond).toHaveBeenCalledOnce();
            expect(respond).toHaveBeenCalledWith({
                body: { type: InteractionResponseType.Pong }
            });
        });
    });
});
