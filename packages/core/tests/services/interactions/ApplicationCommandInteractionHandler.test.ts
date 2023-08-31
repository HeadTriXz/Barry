import {
    type API,
    type APIApplicationCommandInteractionDataOption,
    type ApplicationCommandType,
    ApplicationCommandOptionType
} from "@discordjs/core";
import {
    type SlashCommand,
    ApplicationCommandInteraction,
    ApplicationCommandInteractionHandler,
    Client
} from "../../../src/index.js";

import {
    MockMessageCommand,
    MockSlashCommand,
    MockSlashCommandFoo,
    MockUserCommand,
    createMockModule,
    mockModuleOptions
} from "../../mocks/index.js";
import {
    createMockApplicationCommandInteraction,
    mockAttachment,
    mockChatInputCommand,
    mockInteractionChannel,
    mockInteractionMember,
    mockMessage,
    mockMessageCommand,
    mockRole,
    mockUser,
    mockUserCommand
} from "@barry/testing";

describe("ApplicationCommandInteractionHandler", () => {
    let client: Client;
    let handler: ApplicationCommandInteractionHandler;

    beforeEach(async () => {
        const module = createMockModule({
            ...mockModuleOptions,
            commands: [
                MockSlashCommand,
                MockSlashCommandFoo,
                MockMessageCommand,
                MockUserCommand
            ]
        });

        client = new Client({
            api: {} as API,
            applicationID: "49072635294295155",
            modules: [module]
        });

        handler = new ApplicationCommandInteractionHandler(client);

        await client.initialize();
    });

    describe("handle", () => {
        describe("Execution", () => {
            it("should do nothing if the command is not found", async () => {
                const data = createMockApplicationCommandInteraction({
                    ...mockChatInputCommand,
                    name: "unknown"
                });

                const getCommandSpy = vi.spyOn(client.commands, "get");
                const interaction = new ApplicationCommandInteraction(data, client);

                await handler.handle(interaction);

                expect(getCommandSpy).toHaveBeenCalledOnce();
                expect(getCommandSpy).toHaveReturnedWith(undefined);
            });

            it("should handle a valid 'CHAT_INPUT' command interaction", async () => {
                const data = createMockApplicationCommandInteraction();
                const interaction = new ApplicationCommandInteraction(data, client);

                const command = client.commands.get(interaction);
                const executeSpy = vi.spyOn(command!, "execute");

                await handler.handle(interaction);

                expect(executeSpy).toHaveBeenCalledOnce();
                expect(executeSpy).toHaveBeenCalledWith(interaction, {});
            });

            it("should handle a valid 'MESSAGE' command interaction", async () => {
                const data = createMockApplicationCommandInteraction(mockMessageCommand);
                const interaction = new ApplicationCommandInteraction(data, client);

                const command = client.commands.get(interaction);
                const executeSpy = vi.spyOn(command!, "execute");

                await handler.handle(interaction);

                expect(executeSpy).toHaveBeenCalledOnce();
                expect(executeSpy).toHaveBeenCalledWith(interaction, {
                    message: mockMessage
                });
            });

            it("should handle a valid 'USER' command interaction", async () => {
                const data = createMockApplicationCommandInteraction(mockUserCommand);
                const interaction = new ApplicationCommandInteraction(data, client);

                const command = client.commands.get(interaction);
                const executeSpy = vi.spyOn(command!, "execute");

                await handler.handle(interaction);

                expect(executeSpy).toHaveBeenCalledOnce();
                expect(executeSpy).toHaveBeenCalledWith(interaction, {
                    member: mockInteractionMember,
                    user: mockUser
                });
            });
        });

        describe("Validation", () => {
            it("should set a new cooldown on execution per-guild", async () => {
                const data = createMockApplicationCommandInteraction();
                const interaction = new ApplicationCommandInteraction(data, client);

                await handler.handle(interaction);

                const expiresAt = client.cooldowns.get("68239102456844360:ping:257522665441460225");
                expect(expiresAt).toBeGreaterThan(Date.now());
            });

            it("should set a new cooldown on execution globally in DMs", async () => {
                const data = createMockApplicationCommandInteraction();
                const interaction = new ApplicationCommandInteraction(data, client);
                delete interaction.guildID;

                await handler.handle(interaction);

                const expiresAt = client.cooldowns.get("global:ping:257522665441460225");
                expect(expiresAt).toBeGreaterThan(Date.now());
            });

            it("should throw a ValidationError if the module is disabled", async () => {
                const data = createMockApplicationCommandInteraction();
                const interaction = new ApplicationCommandInteraction(data, client);
                const module = client.modules.get("mock")!;

                vi.spyOn(module, "isEnabled").mockReturnValue(false);

                await expect(() => handler.handle(interaction)).rejects.toThrowError(
                    "This command is currently disabled for this guild."
                );
            });

            it("should throw a ValidationError for insufficient bot permissions", async () => {
                const data = createMockApplicationCommandInteraction();
                const interaction = new ApplicationCommandInteraction(data, client);
                const command = client.commands.get(interaction);

                interaction.appPermissions = 0n;
                command!.appPermissions = 8n;

                await expect(() => handler.handle(interaction)).rejects.toThrowError(
                    "I have insufficient permissions to execute the command."
                );
            });

            it("should throw a ValidationError for a command on cooldown", async () => {
                const data = createMockApplicationCommandInteraction();
                const interaction = new ApplicationCommandInteraction(data, client);

                await handler.handle(interaction);

                await expect(() => handler.handle(interaction)).rejects.toThrowError(
                    "Barry needs to rest his wings for a moment."
                );
            });
        });

        describe("Error handling", () => {
            beforeEach(() => {
                client.logger.error = vi.fn();
            });

            it("should throw an error if the command type is unknown", async () => {
                const data = createMockApplicationCommandInteraction();
                const interaction = new ApplicationCommandInteraction(data, client);
                const command = client.commands.get(interaction)!;

                interaction.data.type = 26 as ApplicationCommandType;
                command.type = 26 as ApplicationCommandType;

                client.commands.add(command);

                await handler.handle(interaction);

                expect(client.logger.error).toHaveBeenCalledOnce();
                expect(client.logger.error).toHaveBeenCalledWith(
                    "An error occurred while executing the command:",
                    expect.objectContaining({
                        message: "Unknown application command type."
                    })
                );
            });

            it("should throw an error if the command type does not match 'CHAT_INPUT'", async () => {
                const data = createMockApplicationCommandInteraction();
                const interaction = new ApplicationCommandInteraction(data, client);
                const command = client.commands.get(interaction)!;

                command.type = 26 as ApplicationCommandType;

                client.commands.get = vi.fn(() => command);

                await handler.handle(interaction);

                expect(client.logger.error).toHaveBeenCalledOnce();
                expect(client.logger.error).toHaveBeenCalledWith(
                    "An error occurred while executing the command:",
                    expect.objectContaining({
                        message: "Invalid command type. Expected \"CHAT_INPUT\" command."
                    })
                );
            });

            it("should throw an error if the command type does not match 'MESSAGE'", async () => {
                const data = createMockApplicationCommandInteraction(mockMessageCommand);
                const interaction = new ApplicationCommandInteraction(data, client);

                const command = client.commands.get(interaction)!;
                command.type = 26 as ApplicationCommandType;

                client.commands.get = vi.fn(() => command);

                await handler.handle(interaction);

                expect(client.logger.error).toHaveBeenCalledOnce();
                expect(client.logger.error).toHaveBeenCalledWith(
                    "An error occurred while executing the command:",
                    expect.objectContaining({
                        message: "Invalid command type. Expected \"MESSAGE\" command."
                    })
                );
            });

            it("should throw an error if the command type does not match 'USER'", async () => {
                const data = createMockApplicationCommandInteraction(mockUserCommand);
                const interaction = new ApplicationCommandInteraction(data, client);

                const command = client.commands.get(interaction)!;
                command.type = 26 as ApplicationCommandType;

                client.commands.get = vi.fn(() => command);

                await handler.handle(interaction);

                expect(client.logger.error).toHaveBeenCalledOnce();
                expect(client.logger.error).toHaveBeenCalledWith(
                    "An error occurred while executing the command:",
                    expect.objectContaining({
                        message: "Invalid command type. Expected \"USER\" command."
                    })
                );
            });

            it("should throw an error if the resolved data is undefined for 'MESSAGE' type", async () => {
                const data = createMockApplicationCommandInteraction(mockMessageCommand);
                const interaction = new ApplicationCommandInteraction(data, client);

                if (!interaction.data.isMessage()) {
                    throw new Error("Test executed for non-'MESSAGE' command.");
                }

                interaction.data.resolved.messages.clear();

                await handler.handle(interaction);

                expect(client.logger.error).toHaveBeenCalledOnce();
                expect(client.logger.error).toHaveBeenCalledWith(
                    "An error occurred while executing the command:",
                    expect.objectContaining({
                        message: "Could not retrieve target message."
                    })
                );
            });

            it("should throw an error if the resolved data is undefined for 'USER' type", async () => {
                const data = createMockApplicationCommandInteraction(mockUserCommand);
                const interaction = new ApplicationCommandInteraction(data, client);

                if (!interaction.data.isUser()) {
                    throw new Error("Test executed for non-'USER' command.");
                }

                interaction.data.resolved.members.clear();
                interaction.data.resolved.users.clear();

                await handler.handle(interaction);

                expect(client.logger.error).toHaveBeenCalledOnce();
                expect(client.logger.error).toHaveBeenCalledWith(
                    "An error occurred while executing the command:",
                    expect.objectContaining({
                        message: "Could not retrieve target user."
                    })
                );
            });
        });
    });

    describe("#getResolvedOptions", () => {
        function createMockInteractionWithOption(
            option?: APIApplicationCommandInteractionDataOption
        ): ApplicationCommandInteraction {
            return new ApplicationCommandInteraction(
                createMockApplicationCommandInteraction({
                    ...mockChatInputCommand,
                    options: option !== undefined ? [option] : []
                }),
                client
            );
        }

        it("should return an empty object if no options are provided", async () => {
            const interaction = createMockInteractionWithOption();

            const command = client.commands.get(interaction);
            const executeSpy = vi.spyOn(command!, "execute");

            await handler.handle(interaction);

            expect(executeSpy).toHaveBeenCalledOnce();
            expect(executeSpy).toHaveBeenCalledWith(interaction, {});
        });

        it("should return the raw value for unknown option types", async () => {
            const interaction = createMockInteractionWithOption({
                name: "foo",
                type: 26 as ApplicationCommandOptionType.String,
                value: "257522665441460225"
            });

            const command = client.commands.get(interaction);
            const executeSpy = vi.spyOn(command!, "execute");

            await handler.handle(interaction);

            expect(executeSpy).toHaveBeenCalledOnce();
            expect(executeSpy).toHaveBeenCalledWith(interaction, {
                foo: "257522665441460225"
            });
        });

        it("should return resolved options of type 'STRING'", async () => {
            const interaction = createMockInteractionWithOption({
                name: "foo",
                type: ApplicationCommandOptionType.String,
                value: "Hello World"
            });

            const command = client.commands.get(interaction);
            const executeSpy = vi.spyOn(command!, "execute");

            await handler.handle(interaction);

            expect(executeSpy).toHaveBeenCalledOnce();
            expect(executeSpy).toHaveBeenCalledWith(interaction, {
                foo: "Hello World"
            });
        });

        it("should return resolved options of type 'INTEGER'", async () => {
            const interaction = createMockInteractionWithOption({
                name: "foo",
                type: ApplicationCommandOptionType.Integer,
                value: 42
            });

            const command = client.commands.get(interaction);
            const executeSpy = vi.spyOn(command!, "execute");

            await handler.handle(interaction);

            expect(executeSpy).toHaveBeenCalledOnce();
            expect(executeSpy).toHaveBeenCalledWith(interaction, {
                foo: 42
            });
        });

        it("should return resolved options of type 'BOOLEAN'", async () => {
            const interaction = createMockInteractionWithOption({
                name: "foo",
                type: ApplicationCommandOptionType.Boolean,
                value: true
            });

            const command = client.commands.get(interaction);
            const executeSpy = vi.spyOn(command!, "execute");

            await handler.handle(interaction);

            expect(executeSpy).toHaveBeenCalledOnce();
            expect(executeSpy).toHaveBeenCalledWith(interaction, {
                foo: true
            });
        });

        it("should return resolved options of type 'NUMBER'", async () => {
            const interaction = createMockInteractionWithOption({
                name: "foo",
                type: ApplicationCommandOptionType.Number,
                value: 42.1
            });

            const command = client.commands.get(interaction);
            const executeSpy = vi.spyOn(command!, "execute");

            await handler.handle(interaction);

            expect(executeSpy).toHaveBeenCalledOnce();
            expect(executeSpy).toHaveBeenCalledWith(interaction, {
                foo: 42.1
            });
        });

        it("should return resolved options of type 'USER'", async () => {
            const interaction = createMockInteractionWithOption({
                name: "foo",
                type: ApplicationCommandOptionType.User,
                value: "257522665441460225"
            });

            const command = client.commands.get(interaction);
            const executeSpy = vi.spyOn(command!, "execute");

            await handler.handle(interaction);

            expect(executeSpy).toHaveBeenCalledOnce();
            expect(executeSpy).toHaveBeenCalledWith(interaction, {
                foo: mockUser
            });
        });

        it("should return resolved options of type 'MEMBER'", async () => {
            const interaction = createMockInteractionWithOption({
                name: "foo",
                type: ApplicationCommandOptionType.User,
                value: "257522665441460225"
            });

            const command = client.commands.get(interaction) as SlashCommand;
            const executeSpy = vi.spyOn(command, "execute");

            command.options = [{
                description: "The description of the option",
                isMember: true,
                name: "foo",
                type: ApplicationCommandOptionType.User
            }];

            await handler.handle(interaction);

            expect(executeSpy).toHaveBeenCalledOnce();
            expect(executeSpy).toHaveBeenCalledWith(interaction, {
                foo: mockInteractionMember
            });
        });

        it("should return resolved options of type 'CHANNEL'", async () => {
            const interaction = createMockInteractionWithOption({
                name: "foo",
                type: ApplicationCommandOptionType.Channel,
                value: "30527482987641765"
            });

            const command = client.commands.get(interaction);
            const executeSpy = vi.spyOn(command!, "execute");

            await handler.handle(interaction);

            expect(executeSpy).toHaveBeenCalledOnce();
            expect(executeSpy).toHaveBeenCalledWith(interaction, {
                foo: mockInteractionChannel
            });
        });

        it("should return resolved options of type 'ROLE'", async () => {
            const interaction = createMockInteractionWithOption({
                name: "foo",
                type: ApplicationCommandOptionType.Role,
                value: "68239102456844360"
            });

            const command = client.commands.get(interaction);
            const executeSpy = vi.spyOn(command!, "execute");

            await handler.handle(interaction);

            expect(executeSpy).toHaveBeenCalledOnce();
            expect(executeSpy).toHaveBeenCalledWith(interaction, {
                foo: mockRole
            });
        });

        it("should return resolved options of type 'MENTIONABLE'", async () => {
            const interaction = createMockInteractionWithOption({
                name: "foo",
                type: ApplicationCommandOptionType.Mentionable,
                value: "68239102456844360"
            });

            const command = client.commands.get(interaction);
            const executeSpy = vi.spyOn(command!, "execute");

            await handler.handle(interaction);

            expect(executeSpy).toHaveBeenCalledOnce();
            expect(executeSpy).toHaveBeenCalledWith(interaction, {
                foo: mockRole
            });
        });

        it("should return resolved options of type 'ATTACHMENT'", async () => {
            const interaction = createMockInteractionWithOption({
                name: "foo",
                type: ApplicationCommandOptionType.Attachment,
                value: "71272489110250160"
            });

            const command = client.commands.get(interaction);
            const executeSpy = vi.spyOn(command!, "execute");

            await handler.handle(interaction);

            expect(executeSpy).toHaveBeenCalledOnce();
            expect(executeSpy).toHaveBeenCalledWith(interaction, {
                foo: mockAttachment
            });
        });

        it("should return resolved options of type 'SUBCOMMAND'", async () => {
            const interaction = createMockInteractionWithOption({
                name: "bar",
                options: [{
                    name: "foo",
                    type: ApplicationCommandOptionType.String,
                    value: "Hello World"
                }],
                type: ApplicationCommandOptionType.Subcommand
            });

            interaction.data.name = "foo";

            const command = client.commands.get(interaction);
            const executeSpy = vi.spyOn(command!, "execute");

            await handler.handle(interaction);

            expect(executeSpy).toHaveBeenCalledOnce();
            expect(executeSpy).toHaveBeenCalledWith(interaction, {
                foo: "Hello World"
            });
        });
    });
});
