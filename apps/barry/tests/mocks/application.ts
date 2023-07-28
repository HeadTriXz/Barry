import type { Redis } from "ioredis";

import { Module, UserCommand } from "@barry/core";

import { Application } from "../../src/Application.js";
import { GatewayIntentBits } from "@discordjs/core";
import { mockDeep } from "vitest-mock-extended";
import { prisma } from "./prisma.js";
import { vi } from "vitest";

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

export class MockModule extends Module {
    constructor(client: Application) {
        super(client, {
            id: "mock",
            name: "Mock",
            description: "Mock module for testing purposes",
            commands: [MockCommand]
        });
    }
}

export const mockAppOptions = {
    discord: {
        applicationID: "49072635294295155",
        intents: GatewayIntentBits.GuildMessages,
        token: "SECRET_TOKEN"
    },
    modules: [MockModule],
    redis: {
        host: "localhost",
        port: 6379
    }
};

/**
 * Creates a new mock client instance.
 *
 * @param override Partial override for client options.
 * @returns The new mock client.
 */
export function createMockApplication(override: Record<string, any> = {}): Application {
    const app = new Application({
        ...mockAppOptions,
        ...override
    });

    app.gateway.connect = vi.fn();
    app.redis = mockDeep<Redis>();
    app.prisma = prisma;

    return app;
}
