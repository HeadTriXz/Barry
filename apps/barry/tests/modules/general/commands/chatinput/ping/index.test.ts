import { ApplicationCommandInteraction, getCreatedAt } from "@barry/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockApplicationCommandInteraction, mockMessage } from "@barry/testing";
import { createMockClient } from "../../../../../mocks/index.js";

import GeneralModule from "../../../../../../src/modules/general/index.js";
import PingCommand from "../../../../../../src/modules/general/commands/chatinput/ping/index.js";

describe("/ping", () => {
    let command: PingCommand;
    let interaction: ApplicationCommandInteraction;

    beforeEach(() => {
        const client = createMockClient();

        const module = new GeneralModule(client);
        command = new PingCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client);

        interaction.defer = vi.fn();
        interaction.editOriginalMessage = vi.fn();
        interaction.getOriginalMessage = vi.fn().mockResolvedValue(mockMessage);
    });

    describe("execute", () => {
        it("should defer the interaction", async () => {
            await command.execute(interaction);

            expect(interaction.defer).toHaveBeenCalledOnce();
        });

        it("should send a response with the latency", async () => {
            const createdAt = getCreatedAt(mockMessage.id);

            await command.execute(interaction);

            expect(interaction.editOriginalMessage).toHaveBeenCalledOnce();
            expect(interaction.editOriginalMessage).toHaveBeenCalledWith({
                content: expect.stringContaining(`Pong! \`${createdAt - interaction.createdAt}ms\``)
            });
        });
    });
});
