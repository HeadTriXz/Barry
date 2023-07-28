import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockApplication, mockAppOptions } from "./mocks/application.js";

import { API } from "@discordjs/core";
import { Application } from "../src/Application.js";
import { Client } from "@barry/core";
import { Logger } from "@barry/logger";
import { WebSocketManager } from "@discordjs/ws";

describe("Application", () => {
    let app: Application;

    beforeEach(() => {
        app = createMockApplication();
        app.commands.sync = vi.fn();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe("constructor", () => {
        it("should initialize with the provided options", () => {
            expect(app.api).toBeInstanceOf(API);
            expect(app.applicationID).toBe(mockAppOptions.discord.applicationID);
            expect(app.gateway).toBeInstanceOf(WebSocketManager);
            expect(app.logger).toBeInstanceOf(Logger);
            expect(app.prisma).toBeDefined();
            expect(app.redis).toBeDefined();
        });
    });

    describe("initialize", () => {
        it("should call super.initialize", async () => {
            const superSpy = vi.spyOn(Client.prototype, "initialize");

            await app.initialize();

            expect(superSpy).toHaveBeenCalledOnce();
            expect(app.modules.size).toBe(1);
        });

        it("should only register commands in developer guilds in a non-production environment", async () => {
            vi.stubEnv("NODE_ENV", "development");
            vi.stubEnv("DEVELOPER_GUILDS", "1, 2, 3");

            await app.initialize();

            const module = app.modules.get("mock");
            const command = module!.commands[0];

            expect(app.commands.size).toBe(1);
            expect(command.guilds).toEqual(["1", "2", "3"]);
        });
    });
});
