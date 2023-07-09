import { type API, GatewayDispatchEvents } from "@discordjs/core";
import {
    type Module,
    type ModuleOptions,
    Client,
    Event
} from "../../src/index.js";

import { beforeEach, describe, expect, it } from "vitest";
import { MockSlashCommandBar, MockSlashCommandFoo } from "../mocks/commands.js";
import { MockModule, mockModuleOptions } from "../mocks/index.js";

class MockEvent extends Event {
    constructor(module: Module) {
        super(module, GatewayDispatchEvents.Ready);
    }

    async execute(): Promise<void> {
        // empty...
    }
}

describe("Module", () => {
    let client: Client;
    let options: Partial<ModuleOptions>;

    beforeEach(() => {
        client = new Client({
            api: {} as API,
            applicationID: "49072635294295155"
        });

        options = {
            commands: [MockSlashCommandFoo, MockSlashCommandBar],
            dependencies: [MockModule],
            events: [MockEvent]
        };
    });

    describe("constructor", () => {
        it("should initialize the module with the provided options", () => {
            const module = new MockModule(client, options);

            expect(module.client).toBe(client);
            expect(module.commands.length).toBe(0);
            expect(module.dependencies.size).toBe(0);
            expect(module.description).toBe(mockModuleOptions.description);
            expect(module.events.length).toBe(0);
            expect(module.id).toBe(mockModuleOptions.id);
            expect(module.name).toBe(mockModuleOptions.name);
        });
    });

    describe("initialize", () => {
        it("should load all commands, dependencies and events when provided as an array", async () => {
            const module = new MockModule(client, options);
            await module.initialize();

            expect(module.commands.length).toBe(2);
            expect(module.dependencies.size).toBe(1);
            expect(module.events.length).toBe(1);
        });

        it("should load all commands, dependencies and events when provided as a promise", async () => {
            const module = new MockModule(client, {
                commands: Promise.resolve([MockSlashCommandFoo, MockSlashCommandBar]),
                dependencies: Promise.resolve([MockModule]),
                events: Promise.resolve([MockEvent])
            });

            await module.initialize();

            expect(module.commands.length).toBe(2);
            expect(module.dependencies.size).toBe(1);
            expect(module.events.length).toBe(1);
        });
    });

    describe("registerCommands", () => {
        it("should register commands to the client", async () => {
            const module = new MockModule(client, options);
            await module.initialize();

            module.registerCommands();

            expect(client.commands.size).toBe(2);
        });

        it("should not register commands that are already registered", async () => {
            const module = new MockModule(client, options);
            await module.initialize();

            module.registerCommands();
            module.registerCommands();

            expect(client.commands.size).toBe(2);
        });
    });

    describe("registerEvents", () => {
        it("should register events to the client", async () => {
            const module = new MockModule(client, options);
            await module.initialize();

            module.registerEvents();

            expect(client.listenerCount(GatewayDispatchEvents.Ready)).toBe(1);
        });

        it("should not register events that are already registered", async () => {
            const module = new MockModule(client, options);
            await module.initialize();

            module.registerEvents();
            module.registerEvents();

            expect(client.listenerCount(GatewayDispatchEvents.Ready)).toBe(1);
        });
    });
});
