import {
    type API,
    ApplicationCommandOptionType,
    ApplicationCommandType
} from "@discordjs/core";
import {
    type Module,
    type SlashCommand,
    AutocompleteInteraction,
    AutocompleteInteractionHandler,
    Client,
    SlashCommandOptionBuilder
} from "../../../src/index.js";

import {
    MockMessageCommand,
    MockSlashCommand,
    MockSlashCommandFoo,
    createMockModule,
    mockModuleOptions
} from "../../mocks/index.js";
import {
    createMockAutocompleteInteraction,
    mockAutocompleteCommand,
    mockAutocompleteSubcommand
} from "@barry-bot/testing";

class MockAutocompleteCommand extends MockSlashCommand {
    constructor(module: Module) {
        super(module, {
            name: "bar",
            options: {
                foo: SlashCommandOptionBuilder.string({
                    description: "The description of the option"
                }),
                bar: SlashCommandOptionBuilder.integer({
                    autocomplete: (value) => {
                        return [
                            {
                                name: "Normal",
                                value: value
                            },
                            {
                                name: "Big",
                                value: value * 2
                            }
                        ];
                    },
                    description: "The description of the option"
                })
            }
        });
    }
}

class MockParentCommand extends MockSlashCommand {
    constructor(module: Module) {
        super(module, {
            children: [MockAutocompleteCommand]
        });
    }
}

describe("AutocompleteInteractionHandler", () => {
    let client: Client;
    let handler: AutocompleteInteractionHandler;

    beforeEach(async () => {
        const module = createMockModule({
            ...mockModuleOptions,
            commands: [
                MockParentCommand,
                MockAutocompleteCommand,
                MockSlashCommandFoo,
                MockMessageCommand
            ]
        });

        client = new Client({
            api: {} as API,
            applicationID: "49072635294295155",
            modules: [module]
        });

        handler = new AutocompleteInteractionHandler(client);

        await client.initialize();
    });

    describe("handle", () => {
        describe("Execution", () => {
            it("should handle a valid autocomplete interaction", async () => {
                const data = createMockAutocompleteInteraction();
                const interaction = new AutocompleteInteraction(data, client, vi.fn());
                const resultSpy = vi.spyOn(interaction, "result");

                await handler.handle(interaction);

                expect(resultSpy).toHaveBeenCalledOnce();
                expect(resultSpy).toHaveBeenCalledWith([
                    {
                        name: "Normal",
                        value: 42
                    },
                    {
                        name: "Big",
                        value: 84
                    }
                ]);
            });

            it("should handle a valid autocomplete interaction on a subcommand", async () => {
                const data = createMockAutocompleteInteraction(mockAutocompleteSubcommand);
                const interaction = new AutocompleteInteraction(data, client, vi.fn());
                const resultSpy = vi.spyOn(interaction, "result");

                await handler.handle(interaction);

                expect(resultSpy).toHaveBeenCalledOnce();
                expect(resultSpy).toHaveBeenCalledWith([
                    {
                        name: "Normal",
                        value: 42
                    },
                    {
                        name: "Big",
                        value: 84
                    }
                ]);
            });

            it("should do nothing if the command is not found", async () => {
                const data = createMockAutocompleteInteraction({
                    ...mockAutocompleteCommand,
                    name: "unknown"
                });

                const getCommandSpy = vi.spyOn(client.commands, "get");
                const interaction = new AutocompleteInteraction(data, client, vi.fn());

                await handler.handle(interaction);

                expect(getCommandSpy).toHaveBeenCalledOnce();
                expect(getCommandSpy).toHaveReturnedWith(undefined);
            });

            it("should do nothing if the command is not of type 'CHAT_INPUT'", async () => {
                const data = createMockAutocompleteInteraction();
                const interaction = new AutocompleteInteraction(data, client, vi.fn());
                const resultSpy = vi.spyOn(interaction, "result");

                interaction.data.type = ApplicationCommandType.Message as ApplicationCommandType.ChatInput;

                await handler.handle(interaction);

                expect(resultSpy).not.toHaveBeenCalled();
            });
        });

        it("should do nothing if the module is disabled", async () => {
            const data = createMockAutocompleteInteraction();
            const interaction = new AutocompleteInteraction(data, client, vi.fn());
            const resultSpy = vi.spyOn(interaction, "result");
            const module = client.modules.get("mock")!;

            vi.spyOn(module, "isEnabled").mockReturnValue(false);

            await handler.handle(interaction);

            expect(resultSpy).not.toHaveBeenCalled();
        });

        describe("Focused option", () => {
            function createMockInteractionWithOption(
                type: ApplicationCommandOptionType.Integer | ApplicationCommandOptionType.Number,
                value: unknown
            ): AutocompleteInteraction {
                const data = createMockAutocompleteInteraction({
                    ...mockAutocompleteCommand,
                    options: [{
                        focused: true,
                        name: "bar",
                        type: type,
                        value: value as number
                    }]
                });

                return new AutocompleteInteraction(data, client, vi.fn());
            }

            it("should do nothing if there is no option focused", async () => {
                const data = createMockAutocompleteInteraction();
                const interaction = new AutocompleteInteraction(data, client, vi.fn());
                const resultSpy = vi.spyOn(interaction, "result");

                interaction.data.options = [];

                await handler.handle(interaction);

                expect(resultSpy).not.toHaveBeenCalled();
            });

            it("should convert the focused option's value to a number if the option type is 'INTEGER'", async () => {
                const interaction = createMockInteractionWithOption(ApplicationCommandOptionType.Integer, "50");
                const resultSpy = vi.spyOn(interaction, "result");

                await handler.handle(interaction);

                expect(resultSpy).toHaveBeenCalledOnce();
                expect(resultSpy).toHaveBeenCalledWith([
                    {
                        name: "Normal",
                        value: 50
                    },
                    {
                        name: "Big",
                        value: 100
                    }
                ]);
            });

            it("should convert the focused option's value to a number if the option type is 'NUMBER'", async () => {
                const interaction = createMockInteractionWithOption(ApplicationCommandOptionType.Number, "50");
                const command = client.commands.get(interaction) as SlashCommand;
                const resultSpy = vi.spyOn(interaction, "result");

                command.options[1].type = ApplicationCommandOptionType.Number;

                await handler.handle(interaction);

                expect(resultSpy).toHaveBeenCalledOnce();
                expect(resultSpy).toHaveBeenCalledWith([
                    {
                        name: "Normal",
                        value: 50
                    },
                    {
                        name: "Big",
                        value: 100
                    }
                ]);
            });

            it("should skip handling if the focused option's value is an invalid number", async () => {
                const interaction = createMockInteractionWithOption(ApplicationCommandOptionType.Integer, "Hello World");
                const resultSpy = vi.spyOn(interaction, "result");

                await handler.handle(interaction);

                expect(resultSpy).not.toHaveBeenCalled();
            });
        });

        describe("Error handling", () => {
            it("should throw an error if the command is missing the focused option", async () => {
                const data = createMockAutocompleteInteraction();
                const interaction = new AutocompleteInteraction(data, client, vi.fn());
                const command = client.commands.get(interaction) as SlashCommand;

                command.options = [];

                await expect(() => handler.handle(interaction)).rejects.toThrowError(
                    "Application command option \"bar\" is missing."
                );
            });

            it("should throw an error if the focused option is missing an autocomplete callback", async () => {
                const data = createMockAutocompleteInteraction();
                const interaction = new AutocompleteInteraction(data, client, vi.fn());
                const command = client.commands.get(interaction) as SlashCommand;

                delete command.options[1].autocomplete;

                await expect(() => handler.handle(interaction)).rejects.toThrowError(
                    "Application command option is missing autocomplete callback."
                );
            });
        });
    });
});
