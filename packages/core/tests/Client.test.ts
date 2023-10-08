import {
    type AnyInteraction,
    type ClientOptions,
    type Gateway,
    type Server,
    Client,
    StatusCodes
} from "../src/index.js";
import {
    type API,
    type GatewayMessageDeleteDispatchData,
    type GatewayVoiceState,
    GatewayDispatchEvents,
    GatewayOpcodes
} from "@discordjs/core";

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
            api: {} as API,
            applicationID: "49072635294295155"
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

        it("should handle incoming interactions from the server", () => {
            const server: Server = new MockServer();
            const serverSpy = vi.spyOn(server, "post");

            options.server = server;
            client = new Client(options);
            const handleSpy = vi.spyOn(client.interactions, "handle").mockResolvedValue();

            serverSpy.mock.calls[0][1](mockPingInteraction, vi.fn());

            expect(serverSpy).toHaveBeenCalledOnce();
            expect(handleSpy).toHaveBeenCalledOnce();
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

    describe("#handleGatewayDispatchEvent", () => {
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
            const handleSpy = vi.spyOn(client.interactions, "handle").mockResolvedValue();

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
            expect(handleSpy).toHaveBeenCalledOnce();
        });

        describe("VoiceStateUpdate", () => {
            const voiceStateUpdateEvent = {
                channel_id: "30527482987641765",
                guild_id: "68239102456844360",
                user_id: "257522665441460225"
            } as GatewayVoiceState;

            it("should handle incoming voice state update events and update 'voiceConnections'", () => {
                const gateway: Gateway = new MockGateway();
                const gatewaySpy = vi.spyOn(gateway, "on");

                options.gateway = gateway;
                client = new Client(options);

                const onVoiceStateUpdate = vi.fn<[GatewayVoiceState, string | undefined]>();
                client.on(GatewayDispatchEvents.VoiceStateUpdate, onVoiceStateUpdate);

                expect(client.voiceConnections.size).toBe(0);

                gatewaySpy.mock.calls[0][1]({
                    data: {
                        op: GatewayOpcodes.Dispatch,
                        t: GatewayDispatchEvents.VoiceStateUpdate,
                        d: voiceStateUpdateEvent,
                        s: 0
                    },
                    shardId: 0
                });

                expect(gatewaySpy).toHaveBeenCalledOnce();
                expect(onVoiceStateUpdate).toHaveBeenCalledOnce();
                expect(onVoiceStateUpdate.mock.calls[0][0]).toEqual(voiceStateUpdateEvent);
                expect(client.voiceConnections.size).toBe(1);
            });

            it("should remove entry from 'voiceConnections' if 'channel_id' is null", () => {
                const gateway: Gateway = new MockGateway();
                const gatewaySpy = vi.spyOn(gateway, "on");

                options.gateway = gateway;
                client = new Client(options);
                client.on(GatewayDispatchEvents.VoiceStateUpdate, vi.fn());

                expect(client.voiceConnections.size).toBe(0);

                gatewaySpy.mock.calls[0][1]({
                    data: {
                        op: GatewayOpcodes.Dispatch,
                        t: GatewayDispatchEvents.VoiceStateUpdate,
                        d: voiceStateUpdateEvent,
                        s: 0
                    },
                    shardId: 0
                });

                expect(client.voiceConnections.size).toBe(1);

                gatewaySpy.mock.calls[0][1]({
                    data: {
                        op: GatewayOpcodes.Dispatch,
                        t: GatewayDispatchEvents.VoiceStateUpdate,
                        d: { ...voiceStateUpdateEvent, channel_id: null },
                        s: 0
                    },
                    shardId: 0
                });

                expect(client.voiceConnections.size).toBe(0);
            });

            it("should emit a 'VoiceStateUpdate' event with the old channel ID", () => {
                const gateway: Gateway = new MockGateway();
                const gatewaySpy = vi.spyOn(gateway, "on");

                options.gateway = gateway;
                client = new Client(options);

                const onVoiceStateUpdate = vi.fn<[GatewayVoiceState, string | undefined]>();
                client.on(GatewayDispatchEvents.VoiceStateUpdate, onVoiceStateUpdate);

                gatewaySpy.mock.calls[0][1]({
                    data: {
                        op: GatewayOpcodes.Dispatch,
                        t: GatewayDispatchEvents.VoiceStateUpdate,
                        d: voiceStateUpdateEvent,
                        s: 0
                    },
                    shardId: 0
                });

                gatewaySpy.mock.calls[0][1]({
                    data: {
                        op: GatewayOpcodes.Dispatch,
                        t: GatewayDispatchEvents.VoiceStateUpdate,
                        d: { ...voiceStateUpdateEvent, channel_id: "60527482987641760" },
                        s: 0
                    },
                    shardId: 0
                });

                expect(gatewaySpy).toHaveBeenCalledOnce();
                expect(onVoiceStateUpdate).toHaveBeenCalledTimes(2);
                expect(onVoiceStateUpdate.mock.calls[0][1]).toBeUndefined();
                expect(onVoiceStateUpdate.mock.calls[1][1]).toBe("30527482987641765");
                expect(client.voiceConnections.size).toBe(1);
            });

            it("should allow multiple voice connections for a single user", () => {
                const gateway: Gateway = new MockGateway();
                const gatewaySpy = vi.spyOn(gateway, "on");

                options.gateway = gateway;
                client = new Client(options);
                client.on(GatewayDispatchEvents.VoiceStateUpdate, vi.fn());

                gatewaySpy.mock.calls[0][1]({
                    data: {
                        op: GatewayOpcodes.Dispatch,
                        t: GatewayDispatchEvents.VoiceStateUpdate,
                        d: voiceStateUpdateEvent,
                        s: 0
                    },
                    shardId: 0
                });

                gatewaySpy.mock.calls[0][1]({
                    data: {
                        op: GatewayOpcodes.Dispatch,
                        t: GatewayDispatchEvents.VoiceStateUpdate,
                        d: { ...voiceStateUpdateEvent, guild_id: "60527482987641760" },
                        s: 0
                    },
                    shardId: 0
                });

                gatewaySpy.mock.calls[0][1]({
                    data: {
                        op: GatewayOpcodes.Dispatch,
                        t: GatewayDispatchEvents.VoiceStateUpdate,
                        d: { ...voiceStateUpdateEvent, guild_id: undefined },
                        s: 0
                    },
                    shardId: 0
                });

                expect(client.voiceConnections.size).toBe(3);
            });
        });
    });
});
