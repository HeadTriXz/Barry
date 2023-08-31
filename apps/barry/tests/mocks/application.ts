import { Application } from "../../src/Application.js";
import { GatewayIntentBits } from "@discordjs/core";
import { MockModule } from "./common.js";
import { prisma } from "./prisma.js";
import { redis } from "./redis.js";

vi.mock("ioredis", () => ({
    Redis: vi.fn(() => redis)
}));

vi.mock("@prisma/client", async (importOriginal) => {
    const original = await importOriginal<typeof import("@prisma/client")>();

    return {
        ...original,
        PrismaClient: vi.fn(() => prisma)
    };
});

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
        logger: {
            debug: vi.fn(),
            error: vi.fn(),
            fatal: vi.fn(),
            info: vi.fn(),
            trace: vi.fn(),
            warn: vi.fn()
        },
        ...mockAppOptions,
        ...override
    });

    app.gateway.connect = vi.fn();

    return app;
}
