import {
    type API,
    ApplicationCommandType,
    ApplicationIntegrationType,
    InteractionContextType
} from "@discordjs/core";
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
            expect(command.contexts).toEqual(baseCommandOptions.contexts);
            expect(command.cooldown).toBe(baseCommandOptions.cooldown);
            expect(command.defaultMemberPermissions).toBe(baseCommandOptions.defaultMemberPermissions);
            expect(command.guilds).toEqual(baseCommandOptions.guilds);
            expect(command.integrationTypes).toEqual(baseCommandOptions.integrationTypes);
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
            expect(command.ownerOnly).toBe(false);
        });

        it("should update 'guildOnly' for backward compatibility", () => {
            const command = new MockBaseCommand(module, {
                name: "test",
                contexts: [InteractionContextType.Guild]
            });

            expect(command.contexts).toEqual([InteractionContextType.Guild]);
            expect(command.guildOnly).toBe(true);
        });

        it("should update 'contexts' if 'guildOnly' is set to 'true'", () => {
            const command = new MockBaseCommand(module, {
                name: "test",
                guildOnly: true
            });

            expect(command.contexts).toEqual([InteractionContextType.Guild]);
            expect(command.guildOnly).toBe(true);
        });

        it("should update 'contexts' if 'guildOnly' is set to 'false'", () => {
            const command = new MockBaseCommand(module, {
                name: "test",
                guildOnly: false
            });

            expect(command.contexts).toEqual([
                InteractionContextType.Guild,
                InteractionContextType.BotDM,
                InteractionContextType.PrivateChannel
            ]);
            expect(command.guildOnly).toBe(false);
        });

        it("should log a warning if 'guildOnly' is used", () => {
            const spy = vi.spyOn(console, "warn");

            new MockBaseCommand(module, {
                name: "test",
                guildOnly: true
            });

            expect(spy).toHaveBeenCalledOnce();
            expect(spy).toHaveBeenCalledWith("The 'guildOnly' option is deprecated. Please use the 'contexts' option instead.");
        });
    });

    describe("toJSON", () => {
        it("should return the JSON representation of the command", () => {
            const command = new MockBaseCommand(module, baseCommandOptions);
            const payload = command.toJSON();

            expect(payload).toEqual({
                contexts: [InteractionContextType.Guild],
                default_member_permissions: "512",
                integration_types: [ApplicationIntegrationType.GuildInstall],
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
