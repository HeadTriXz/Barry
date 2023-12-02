import type { Application } from "../../src/Application.js";

import { Event, Module, UserCommand } from "@barry-bot/core";
import { GatewayDispatchEvents } from "@discordjs/core";

export class MockCommand extends UserCommand {
    constructor(module: Module) {
        super(module, {
            name: "Foo"
        });
    }

    async execute(): Promise<void> {
        // empty...
    }
}

export class MockEvent extends Event {
    constructor(module: Module) {
        super(module, GatewayDispatchEvents.InteractionCreate);
    }

    async execute(): Promise<void> {
        // empty...
    }
}

export class MockModule extends Module {
    constructor(client: Application) {
        super(client, {
            id: "mock",
            name: "Mock",
            description: "Mock module for testing purposes",
            commands: [MockCommand],
            events: [MockEvent]
        });
    }

    isEnabled(): boolean {
        return true;
    }
}
