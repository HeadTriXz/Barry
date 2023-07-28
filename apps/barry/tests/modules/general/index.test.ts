import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationCommandInteraction, Module } from "@barry/core";
import { createMockApplicationCommandInteraction } from "@barry/testing";
import { createMockApplication } from "../../mocks/application.js";

import GeneralModule from "../../../src/modules/general/index.js";
import PingCommand from "../../../src/modules/general/commands/chatinput/ping/index.js";

describe("GeneralModule", () => {
    let command: PingCommand;
    let interaction: ApplicationCommandInteraction;
    let module: GeneralModule;

    beforeEach(() => {
        const client = createMockApplication();
        client.logger.error = vi.fn();

        Module.prototype.initialize = vi.fn(() => {
            module.commands = [command];
            client.commands.add(command);

            return Promise.resolve();
        });

        module = new GeneralModule(client);
        command = new PingCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client);
        interaction.createMessage = vi.fn();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe("initialize", () => {
        it("should call super.initialize", async () => {
            await module.initialize();

            expect(Module.prototype.initialize).toHaveBeenCalledOnce();
            expect(module.client.commands.size).toBeGreaterThan(0);
        });

        describe("Command Execution Middlware", () => {
            describe("Error handling", () => {
                it("should catch errors and log them to client", async () => {
                    await module.initialize();

                    const error = new Error("Oh no!");
                    module.client.interactions.addMiddleware(() => {
                        throw error;
                    });

                    await module.client.interactions.handle(interaction);

                    expect(module.client.logger.error).toHaveBeenCalledOnce();
                    expect(module.client.logger.error).toHaveBeenCalledWith(error);
                });
            });

            describe("ownerOnly", () => {
                it("should disallow if the current user is not a developer and 'ownerOnly' is true", async () => {
                    vi.stubEnv("DEVELOPER_USERS", "257522665437265920, 257522665458237440");

                    command.ownerOnly = true;

                    await module.initialize();
                    await module.client.interactions.handle(interaction);

                    expect(interaction.createMessage).toHaveBeenCalledOnce();
                    expect(interaction.createMessage).toHaveBeenCalledWith({
                        content: expect.stringContaining("You are not permitted to use that command.")
                    });
                });

                it("should disallow everyone if no developers are set and 'ownerOnly' is true", async () => {
                    vi.stubEnv("DEVELOPER_USERS", "");

                    command.ownerOnly = true;

                    await module.initialize();
                    await module.client.interactions.handle(interaction);

                    expect(interaction.createMessage).toHaveBeenCalledOnce();
                    expect(interaction.createMessage).toHaveBeenCalledWith({
                        content: expect.stringContaining("You are not permitted to use that command.")
                    });
                });

                it("should allow everyone if 'ownerOnly' is false", async () => {
                    vi.stubEnv("DEVELOPER_USERS", "257522665437265920, 257522665458237440");

                    await module.initialize();
                    await module.client.interactions.handle(interaction);

                    expect(interaction.createMessage).not.toHaveBeenCalledWith({
                        content: expect.stringContaining("You are not permitted to use that command.")
                    });
                });

                it("should stop execution if command is not found", async () => {
                    await module.initialize();

                    const nextMiddleware = vi.fn();
                    module.client.interactions.addMiddleware(nextMiddleware);

                    interaction.data.name = "unknown";
                    await module.client.interactions.handle(interaction);

                    expect(nextMiddleware).not.toHaveBeenCalled();
                });
            });
        });
    });
});
