import { ApplicationCommandInteraction, AutocompleteInteraction, Module, ValidationError } from "@barry-bot/core";
import { createMockApplicationCommandInteraction, createMockAutocompleteInteraction, mockUserCommand } from "@barry-bot/testing";

import { BlacklistedGuildRepository } from "../../../src/modules/developers/database/BlacklistedGuildRepository.js";
import { BlacklistedUserRepository } from "../../../src/modules/developers/database/BlacklistedUserRepository.js";
import { InteractionType, MessageFlags } from "@discordjs/core";
import { MockCommand } from "../../mocks/common.js";
import { createMockApplication } from "../../mocks/application.js";

import DevelopersModule from "../../../src/modules/developers/index.js";

describe("DevelopersModule", () => {
    let command: MockCommand;
    let interaction: ApplicationCommandInteraction;
    let module: DevelopersModule;

    beforeEach(() => {
        const client = createMockApplication();
        Module.prototype.initialize = vi.fn(() => {
            module.commands = [command];
            client.commands.add(command);

            return Promise.resolve();
        });

        module = new DevelopersModule(client);
        command = new MockCommand(module);

        const data = createMockApplicationCommandInteraction({
            ...mockUserCommand,
            name: command.name
        });
        interaction = new ApplicationCommandInteraction(data, client);
        interaction.createMessage = vi.fn();

        vi.spyOn(module.blacklistedUsers, "isBlacklisted").mockResolvedValue(false);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
    });

    describe("constructor", () => {
        it("should set up the repositories correctly", () => {
            expect(module.blacklistedGuilds).toBeInstanceOf(BlacklistedGuildRepository);
            expect(module.blacklistedUsers).toBeInstanceOf(BlacklistedUserRepository);
        });
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

                it("should send an error message to the user if the interaction is of type 'ApplicationCommand'", async () => {
                    await module.initialize();

                    const error = new ValidationError("Oh no!");
                    module.client.interactions.addMiddleware(() => {
                        throw error;
                    });

                    await module.client.interactions.handle(interaction);

                    expect(interaction.createMessage).toHaveBeenCalledOnce();
                    expect(interaction.createMessage).toHaveBeenCalledWith({
                        content: expect.stringContaining(error.message),
                        flags: MessageFlags.Ephemeral
                    });
                });

                it("should send an error message to the user if the interaction is of type 'MessageComponent'", async () => {
                    interaction.type = InteractionType.MessageComponent as InteractionType.ApplicationCommand;

                    await module.initialize();

                    const error = new ValidationError("Oh no!");
                    module.client.interactions.addMiddleware(() => {
                        throw error;
                    });

                    await module.client.interactions.handle(interaction);

                    expect(interaction.createMessage).toHaveBeenCalledOnce();
                    expect(interaction.createMessage).toHaveBeenCalledWith({
                        content: expect.stringContaining(error.message),
                        flags: MessageFlags.Ephemeral
                    });
                });

                it("should send an error message to the user if the interaction is of type 'ModalSubmit'", async () => {
                    interaction.type = InteractionType.ModalSubmit as InteractionType.ApplicationCommand;

                    await module.initialize();

                    const error = new ValidationError("Oh no!");
                    module.client.interactions.addMiddleware(() => {
                        throw error;
                    });

                    await module.client.interactions.handle(interaction);

                    expect(interaction.createMessage).toHaveBeenCalledOnce();
                    expect(interaction.createMessage).toHaveBeenCalledWith({
                        content: expect.stringContaining(error.message),
                        flags: MessageFlags.Ephemeral
                    });
                });

                it("should send an error result to the user if the interaction is of type 'Autocomplete'", async () => {
                    const data = createMockAutocompleteInteraction();
                    const interaction = new AutocompleteInteraction(data, module.client, vi.fn());
                    interaction.result = vi.fn();

                    await module.initialize();

                    const error = new ValidationError("Oh no!");
                    module.client.interactions.addMiddleware(() => {
                        throw error;
                    });

                    await module.client.interactions.handle(interaction);

                    expect(interaction.result).toHaveBeenCalledOnce();
                    expect(interaction.result).toHaveBeenCalledWith([{
                        name: error.message,
                        value: "error"
                    }]);
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
                        content: expect.stringContaining("You are not permitted to use that command."),
                        flags: MessageFlags.Ephemeral
                    });
                });

                it("should disallow everyone if no developers are set and 'ownerOnly' is true", async () => {
                    vi.stubEnv("DEVELOPER_USERS", "");

                    command.ownerOnly = true;

                    await module.initialize();
                    await module.client.interactions.handle(interaction);

                    expect(interaction.createMessage).toHaveBeenCalledOnce();
                    expect(interaction.createMessage).toHaveBeenCalledWith({
                        content: expect.stringContaining("You are not permitted to use that command."),
                        flags: MessageFlags.Ephemeral
                    });
                });

                it("should allow everyone if 'ownerOnly' is false", async () => {
                    vi.stubEnv("DEVELOPER_USERS", "257522665437265920, 257522665458237440");

                    await module.initialize();
                    await module.client.interactions.handle(interaction);

                    expect(interaction.createMessage).not.toHaveBeenCalledWith({
                        content: expect.stringContaining("You are not permitted to use that command."),
                        flags: MessageFlags.Ephemeral
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

            describe("blacklisted", () => {
                it("should disallow if the user is blacklisted", async () => {
                    vi.spyOn(module.blacklistedUsers, "isBlacklisted").mockResolvedValue(true);

                    await module.initialize();
                    await module.client.interactions.handle(interaction);

                    expect(interaction.createMessage).toHaveBeenCalledOnce();
                    expect(interaction.createMessage).toHaveBeenCalledWith({
                        content: expect.stringContaining("You are blacklisted from interacting with me."),
                        flags: MessageFlags.Ephemeral
                    });
                });

                it("should allow if the user is not blacklisted", async () => {
                    await module.initialize();
                    await module.client.interactions.handle(interaction);

                    expect(interaction.createMessage).not.toHaveBeenCalled();
                });
            });
        });
    });
});
