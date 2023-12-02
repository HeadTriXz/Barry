import {
    type CommandRegistry,
    type Module,
    ApplicationCommandInteraction,
    Client,
    CommandService
} from "../../../src/index.js";
import {
    type API,
    ApplicationCommandOptionType,
    ApplicationCommandType
} from "@discordjs/core";

import {
    MockModule,
    MockMessageCommand,
    MockSlashCommand,
    MockSlashCommandBar,
    MockSlashCommandFoo,
    MockSlashCommandFooBar,
    MockUserCommand
} from "../../mocks/index.js";
import {
    createMockApplicationCommandInteraction,
    mockChatInputCommand,
    mockMessageCommand,
    mockUserCommand
} from "@barry-bot/testing";

describe("CommandService", () => {
    let client: Client;
    let commands: CommandRegistry;
    let module: Module;

    beforeEach(() => {
        client = new Client({
            api: {
                applicationCommands: {
                    bulkOverwriteGuildCommands: vi.fn(),
                    bulkOverwriteGlobalCommands: vi.fn()
                }
            } as unknown as API,
            applicationID: "49072635294295155"
        });
        commands = new CommandService(client);
        module = new MockModule(client);
    });

    describe("add", () => {
        it("should register a global command", () => {
            const command = new MockSlashCommand(module);

            commands.add(command);

            expect(commands.size).toBe(1);
        });

        it("should register a guild command", () => {
            const command = new MockSlashCommand(module, {
                guilds: ["68239102456844360", "30527482987641765"]
            });

            commands.add(command);

            expect(commands.size).toBe(2);
        });
    });

    describe("delete", () => {
        it("should remove a registered global command", () => {
            const command = new MockSlashCommand(module);

            commands.add(command);
            commands.delete(command);

            expect(commands.size).toBe(0);
        });

        it("should remove a registered guild command", () => {
            const command = new MockSlashCommand(module, {
                guilds: ["68239102456844360", "30527482987641765"]
            });

            commands.add(command);
            commands.delete(command);

            expect(commands.size).toBe(0);
        });
    });

    describe("get", () => {
        it("should return a registered global command", () => {
            const data = createMockApplicationCommandInteraction();
            const command = new MockSlashCommand(module, {
                name: data.data.name
            });

            commands.add(command);
            const interaction = new ApplicationCommandInteraction(data, client);

            expect(commands.size).toBe(1);
            expect(commands.get(interaction)).toBe(command);
        });

        it("should return a registered guild command", () => {
            const data = createMockApplicationCommandInteraction({
                ...mockChatInputCommand,
                guild_id: "68239102456844360"
            });

            const command = new MockSlashCommand(module, {
                name: data.data.name,
                guilds: ["68239102456844360", "30527482987641765"]
            });

            commands.add(command);

            const interaction = new ApplicationCommandInteraction(data, client);

            expect(commands.size).toBe(2);
            expect(commands.get(interaction)).toBe(command);
        });

        it("should return a registered subcommand", () => {
            const data = createMockApplicationCommandInteraction({
                ...mockChatInputCommand,
                options: [{
                    name: "foo",
                    type: ApplicationCommandOptionType.SubcommandGroup,
                    options: [{
                        name: "bar",
                        type: ApplicationCommandOptionType.Subcommand
                    }]
                }]
            });

            const command = new MockSlashCommand(module, {
                name: data.data.name,
                children: [MockSlashCommandFoo, MockSlashCommandBar]
            });

            commands.add(command);

            const interaction = new ApplicationCommandInteraction(data, client);

            expect(commands.size).toBe(1);
            expect(commands.get(interaction)).toBeInstanceOf(MockSlashCommandFooBar);
        });

        it("should return a message command", () => {
            const data = createMockApplicationCommandInteraction(mockMessageCommand);
            const command = new MockMessageCommand(module, {
                name: data.data.name
            });

            commands.add(command);

            const interaction = new ApplicationCommandInteraction(data, client);

            expect(commands.size).toBe(1);
            expect(commands.get(interaction)).toBe(command);
        });

        it("should return a user command", () => {
            const data = createMockApplicationCommandInteraction(mockUserCommand);
            const command = new MockUserCommand(module, {
                name: data.data.name
            });

            commands.add(command);

            const interaction = new ApplicationCommandInteraction(data, client);

            expect(commands.size).toBe(1);
            expect(commands.get(interaction)).toBe(command);
        });

        it("should throw an error if the command type is not expected", () => {
            const data = createMockApplicationCommandInteraction();
            const command = new MockSlashCommand(module, {
                name: data.data.name
            });

            commands.add(command);
            command.type = ApplicationCommandType.User as ApplicationCommandType.ChatInput;

            const interaction = new ApplicationCommandInteraction(data, client);

            expect(() => commands.get(interaction)).toThrowError(
                "Invalid command type. Expected \"CHAT_INPUT\" command."
            );
        });
    });

    describe("sync", () => {
        it("should synchronize global commands", async () => {
            const command = new MockSlashCommand(module);

            commands.add(command);

            await commands.sync();

            expect(client.api.applicationCommands.bulkOverwriteGlobalCommands).toHaveBeenCalledOnce();
            expect(client.api.applicationCommands.bulkOverwriteGlobalCommands).toHaveBeenCalledWith(
                client.applicationID,
                [command.toJSON()]
            );
        });

        it("should synchronize guild commands", async () => {
            const command = new MockSlashCommand(module, {
                guilds: ["68239102456844360", "30527482987641765"]
            });

            commands.add(command);

            await commands.sync();

            expect(client.api.applicationCommands.bulkOverwriteGuildCommands).toHaveBeenCalledTimes(2);
            expect(client.api.applicationCommands.bulkOverwriteGuildCommands).toHaveBeenCalledWith(
                client.applicationID,
                "68239102456844360",
                [command.toJSON()]
            );

            expect(client.api.applicationCommands.bulkOverwriteGuildCommands).toHaveBeenCalledWith(
                client.applicationID,
                "30527482987641765",
                [command.toJSON()]
            );
        });
    });

    describe("[Symbol.iterator]", () => {
        it("should return an iterator over the registered commands", () => {
            const commandFoo = new MockSlashCommand(module, { name: "foo" });
            const commandBar = new MockSlashCommand(module, { name: "bar" });
            const commandBaz = new MockSlashCommand(module, { name: "baz" });

            commands.add(commandFoo);
            commands.add(commandBar);
            commands.add(commandBaz);

            const iterator = commands[Symbol.iterator]();

            expect(iterator.next().value).toBe(commandFoo);
            expect(iterator.next().value).toBe(commandBar);
            expect(iterator.next().value).toBe(commandBaz);
            expect(iterator.next().done).toBe(true);
        });
    });
});
