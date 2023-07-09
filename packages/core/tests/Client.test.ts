import {
    type AnyInteraction,
    type ClientOptions,
    type Gateway,
    type Server,
    Client,
    Interaction,
    StatusCodes
} from "../src/index.js";
import {
    type API,
    type GatewayMessageDeleteDispatchData,
    GatewayDispatchEvents,
    GatewayOpcodes
} from "@discordjs/core";

import { beforeEach, describe, it, expect, vi } from "vitest";
import {
    MockGateway,
    MockServer,
    createMockModule
} from "./mocks/index.js";

import { mockPingInteraction } from "@barry/testing";
import { Logger } from "@barry/logger";

describe("Client", () => {
    let client: Client;
    let options: ClientOptions;

    beforeEach(() => {
        options = {
            applicationID: "12345678912345678",
            api: {} as API
        };
        client = new Client(options);
    });

    describe("constructor", () => {
        it("should initialize with the provided options", () => {
            expect(client.api).toEqual(options.api);
            expect(client.applicationID).toBe(options.applicationID);
            expect(client.gateway).toBeUndefined();
            expect(client.server).toBeUndefined();
        });

        it("should initialize with default options", () => {
            expect(client.logger).toBeInstanceOf(Logger);
        });

        it("should handle incoming events from the gateway", () => {
            const gateway: Gateway = new MockGateway();
            const gatewaySpy = vi.spyOn(gateway, "on");

            options.gateway = gateway;
            client = new Client(options);

            const onMessageDelete = vi.fn<[GatewayMessageDeleteDispatchData]>();
            client.on(GatewayDispatchEvents.MessageDelete, onMessageDelete);

            const deleteEvent = {
                channel_id: "30527482987641765",
                id: "91256340920236565"
            };

            gatewaySpy.mock.calls[0][1]({
                data: {
                    op: GatewayOpcodes.Dispatch,
                    t: GatewayDispatchEvents.MessageDelete,
                    d: deleteEvent,
                    s: 0
                },
                shardId: 0
            });

            expect(gatewaySpy).toHaveBeenCalledOnce();
            expect(onMessageDelete).toHaveBeenCalledOnce();
            expect(onMessageDelete.mock.calls[0][0]).toEqual(deleteEvent);
        });

        it("should handle incoming interactions from the gateway", () => {
            const gateway: Gateway = new MockGateway();
            const gatewaySpy = vi.spyOn(gateway, "on");

            options.gateway = gateway;

            client = new Client(options);
            client.interactions.addMiddleware(() => Promise.resolve());

            const onInteraction = vi.fn<[AnyInteraction]>();
            client.on(GatewayDispatchEvents.InteractionCreate, onInteraction);

            gatewaySpy.mock.calls[0][1]({
                data: {
                    op: GatewayOpcodes.Dispatch,
                    t: GatewayDispatchEvents.InteractionCreate,
                    d: mockPingInteraction,
                    s: 0
                },
                shardId: 0
            });

            expect(gatewaySpy).toHaveBeenCalledOnce();
            expect(onInteraction).toHaveBeenCalledOnce();
            expect(onInteraction.mock.calls[0][0]).toBeInstanceOf(Interaction);
        });

        it("should handle incoming interactions from the server", () => {
            const server: Server = new MockServer();
            const serverSpy = vi.spyOn(server, "post");

            options.server = server;

            client = new Client(options);
            client.interactions.addMiddleware(() => Promise.resolve());

            const onInteraction = vi.fn<[AnyInteraction]>();
            client.on(GatewayDispatchEvents.InteractionCreate, onInteraction);

            serverSpy.mock.calls[0][1](mockPingInteraction, vi.fn());

            expect(serverSpy).toHaveBeenCalledOnce();
            expect(onInteraction).toHaveBeenCalledOnce();
            expect(onInteraction.mock.calls[0][0]).toBeInstanceOf(Interaction);
        });

        it("should handle invalid incoming server events", () => {
            const server: Server = new MockServer();
            const serverSpy = vi.spyOn(server, "post");

            options.server = server;

            client = new Client(options);
            client.interactions.addMiddleware(() => Promise.resolve());

            const onInteraction = vi.fn<[AnyInteraction]>();
            client.on(GatewayDispatchEvents.InteractionCreate, onInteraction);

            const respond = vi.fn();
            serverSpy.mock.calls[0][1]({}, respond);

            expect(serverSpy).toHaveBeenCalledOnce();
            expect(onInteraction).not.toHaveBeenCalledOnce();
            expect(respond).toHaveBeenCalledOnce();
            expect(respond).toHaveBeenCalledWith({
                body: { error: "Invalid request" },
                status: StatusCodes.BAD_REQUEST
            });
        });
    });

    describe("initialize", () => {
        it("should add modules when provided as an array", async () => {
            const module1 = createMockModule({
                id: "foo",
                name: "Foo",
                description: "Lorem ipsum dolor sit amet."
            });

            const module2 = createMockModule({
                id: "bar",
                name: "Bar",
                description: "Lorem ipsum dolor sit amet."
            });

            options.modules = [module1, module2];
            client = new Client(options);

            await client.initialize();

            expect(client.modules.get("foo")).toBeInstanceOf(module1);
            expect(client.modules.get("bar")).toBeInstanceOf(module2);
        });

        it("should add modules when provided as a promise", async () => {
            const module1 = createMockModule({
                id: "foo",
                name: "Foo",
                description: "Lorem ipsum dolor sit amet."
            });

            const module2 = createMockModule({
                id: "bar",
                name: "Bar",
                description: "Lorem ipsum dolor sit amet."
            });

            options.modules = Promise.resolve([module1, module2]);
            client = new Client(options);

            await client.initialize();

            expect(client.modules.get("foo")).toBeInstanceOf(module1);
            expect(client.modules.get("bar")).toBeInstanceOf(module2);
        });
    });
});
