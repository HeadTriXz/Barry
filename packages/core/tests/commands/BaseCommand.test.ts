import { type API, ApplicationCommandType } from "@discordjs/core";
import { type Module, Client } from "../../src/index.js";

import { MockBaseCommand, MockModule, baseCommandOptions } from "../mocks/index.js";

describe("BaseCommand", () => {
    let client: Client;
    let module: Module;

    beforeEach(() => {
        client = new Client({
            api: {} as API,
            applicationID: "49072635294295155"
        });

        module = new MockModule(client);
    });

    describe("constructor", () => {
        it("should initialize the command with the provided options", () => {
            const command = new MockBaseCommand(module, baseCommandOptions);

            expect(command.appPermissions).toBe(baseCommandOptions.appPermissions);
            expect(command.client).toBe(client);
            expect(command.cooldown).toBe(baseCommandOptions.cooldown);
            expect(command.defaultMemberPermissions).toBe(baseCommandOptions.defaultMemberPermissions);
            expect(command.guildOnly).toBe(baseCommandOptions.guildOnly);
            expect(command.guilds).toEqual(baseCommandOptions.guilds);
            expect(command.module).toBe(module);
            expect(command.name).toBe(baseCommandOptions.name);
            expect(command.nameLocalizations).toEqual(baseCommandOptions.nameLocalizations);
            expect(command.nsfw).toBe(baseCommandOptions.nsfw);
            expect(command.ownerOnly).toBe(baseCommandOptions.ownerOnly);
        });

        it("should set default values for optional options", () => {
            const command = new MockBaseCommand(module, {
                name: "test"
            });

            expect(command.cooldown).toBe(3);
            expect(command.guildOnly).toBe(false);
            expect(command.ownerOnly).toBe(false);
        });
    });

    describe("toJSON", () => {
        it("should return the JSON representation of the command", () => {
            const command = new MockBaseCommand(module, baseCommandOptions);
            const payload = command.toJSON();

            expect(payload).toEqual({
                default_member_permissions: "512",
                dm_permission: false,
                name: "test",
                name_localizations: {
                  "en-US": "Test",
                  "fr": "Baguette"
                },
                nsfw: true,
                type: ApplicationCommandType.ChatInput
            });
        });

        it("should omit optional options that were not provided", () => {
            const command = new MockBaseCommand(module, {
                name: "test"
            });
            const payload = command.toJSON();

            expect(payload).toEqual({
                dm_permission: true,
                name: "test",
                type: ApplicationCommandType.ChatInput
            });
        });
    });

    describe("toString", () => {
        it("should return a string representing the command", () => {
            const command = new MockBaseCommand(module, {
                name: "test"
            });

            expect(command.toString()).toBe("BaseCommand<test>");
        });
    });
});
