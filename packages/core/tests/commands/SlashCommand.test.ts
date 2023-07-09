import {
    type API,
    ApplicationCommandOptionType,
    ApplicationCommandType
} from "@discordjs/core";
import { type Module, Client } from "../../src/index.js";

import { beforeEach, describe, expect, it } from "vitest";
import {
    MockModule,
    MockSlashCommand,
    MockSlashCommandBar,
    MockSlashCommandFoo,
    baseSlashCommandOptions,
    slashCommandOptions
} from "../mocks/index.js";

describe("SlashCommand", () => {
    let client: Client;
    let module: Module;

    beforeEach(() => {
        client = new Client({
            api: {} as API,
            applicationID: "49072635294295155"
        });

        module = new MockModule(client);
    });

    describe("type", () => {
        it("should be of type 'CHAT_INPUT'", () => {
            const command = new MockSlashCommand(module, baseSlashCommandOptions);

            expect(command.type).toBe(ApplicationCommandType.ChatInput);
        });
    });

    describe("constructor", () => {
        it("should initialize the command with the provided options", () => {
            const command = new MockSlashCommand(module, slashCommandOptions);

            expect(command.description).toBe(slashCommandOptions.description);
            expect(command.descriptionLocalizations).toEqual(slashCommandOptions.descriptionLocalizations);
            expect(command.options).toEqual([
                {
                    description: "Lorem ipsum dolor sit amet.",
                    max_value: 100,
                    min_value: 10,
                    name: "foo",
                    required: true,
                    type: ApplicationCommandOptionType.Number
                },
                {
                    description: "Lorem ipsum dolor sit amet.",
                    name: "bar",
                    type: ApplicationCommandOptionType.Boolean
                }
            ]);
        });

        it("should add subcommands when provided as an array", () => {
            const command = new MockSlashCommand(module, slashCommandOptions);

            expect(command.children.get("foo")).toBeInstanceOf(MockSlashCommandFoo);
            expect(command.children.get("bar")).toBeInstanceOf(MockSlashCommandBar);
        });

        it("should add subcommands when provided as a promise", async () => {
            const children = Promise.resolve([MockSlashCommandFoo, MockSlashCommandBar]);
            const command = new MockSlashCommand(module, { ...slashCommandOptions, children });

            await children;

            expect(command.children.get("foo")).toBeInstanceOf(MockSlashCommandFoo);
            expect(command.children.get("bar")).toBeInstanceOf(MockSlashCommandBar);
        });
    });

    describe("toJSON", () => {
        it("should return the JSON representation of the command", () => {
            const command = new MockSlashCommand(module, slashCommandOptions);
            const payload = command.toJSON();

            expect(payload).toEqual({
                default_member_permissions: "512",
                description: slashCommandOptions.description,
                description_localizations: slashCommandOptions.descriptionLocalizations,
                dm_permission: !slashCommandOptions.guildOnly,
                name: slashCommandOptions.name,
                name_localizations: slashCommandOptions.nameLocalizations,
                nsfw: slashCommandOptions.nsfw,
                options: [
                    {
                        description: "Mock subcommand for testing purposes",
                        name: "foo",
                        options: [{
                            description: "Mock subcommand for testing purposes",
                            name: "bar",
                            options: [],
                            type: ApplicationCommandOptionType.Subcommand
                        }],
                        type: ApplicationCommandOptionType.SubcommandGroup
                    },
                    {
                        description: "Mock subcommand for testing purposes",
                        name: "bar",
                        options: [],
                        type: ApplicationCommandOptionType.Subcommand
                    },
                    {
                        autocomplete: false,
                        description: "Lorem ipsum dolor sit amet.",
                        max_value: 100,
                        min_value: 10,
                        name: "foo",
                        required: true,
                        type: ApplicationCommandOptionType.Number
                    },
                    {
                        autocomplete: false,
                        description: "Lorem ipsum dolor sit amet.",
                        name: "bar",
                        type: ApplicationCommandOptionType.Boolean
                    }
                ],
                type: ApplicationCommandType.ChatInput
            });
        });

        it("should omit optional options that were not provided", () => {
            const command = new MockSlashCommand(module, baseSlashCommandOptions);
            const payload = command.toJSON();

            expect(payload).toEqual({
                description: "Mock command for testing purposes",
                dm_permission: true,
                name: "test",
                options: [],
                type: ApplicationCommandType.ChatInput
            });
        });
    });

    describe("toString", () => {
        it("should return a string representing the command", () => {
            const command = new MockSlashCommand(module, baseSlashCommandOptions);

            expect(command.toString()).toBe("SlashCommand<test>");
        });
    });
});

