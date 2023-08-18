import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockApplication, mockAppOptions } from "./mocks/application.js";

import { API, GatewayDispatchEvents } from "@discordjs/core";
import { Application } from "../src/Application.js";
import { Client } from "@barry/core";
import { mockMessage, mockUser } from "@barry/testing";

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
            expect(app.gateway).toBeDefined();
            expect(app.logger).toBeDefined();
            expect(app.prisma).toBeDefined();
            expect(app.redis).toBeDefined();
        });
    });

    describe("awaitMessage", () => {
        afterEach(() => {
            vi.useRealTimers();
        });

        it("should resolve with the matching interaction when found", async () => {
            const offSpy = vi.spyOn(app, "off");
            const promise = app.awaitMessage(mockMessage.channel_id);

            app.emit(GatewayDispatchEvents.MessageCreate, mockMessage);

            await expect(promise).resolves.toBe(mockMessage);
            expect(offSpy).toHaveBeenCalledOnce();
        });

        it("should resolve with undefined if the timeout is reached", async () => {
            vi.useFakeTimers();

            const offSpy = vi.spyOn(app, "off");
            const promise = app.awaitMessage(mockMessage.channel_id, undefined, 2000);

            vi.advanceTimersByTime(3000);

            await expect(promise).resolves.toBeUndefined();
            expect(offSpy).toHaveBeenCalledOnce();
        });

        it("should ignore users that do not match the supplied user", async () => {
            const offSpy = vi.spyOn(app, "off");
            const promise = app.awaitMessage(mockMessage.channel_id, mockMessage.author.id);

            app.emit(GatewayDispatchEvents.MessageCreate, {
                ...mockMessage,
                author: { ...mockUser, id: "257522665458237440" }
            });

            app.emit(GatewayDispatchEvents.MessageCreate, mockMessage);

            await expect(promise).resolves.toBe(mockMessage);
            expect(offSpy).toHaveBeenCalledOnce();
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
