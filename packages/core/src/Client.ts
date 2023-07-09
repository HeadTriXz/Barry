import {
    type AnyInteraction,
    type CommandRegistry,
    type ConstructorArray,
    type CooldownManager,
    type MiddlewareCapableHandler,
    type Module,
    type ModuleRegistry,
    CommandService,
    InteractionFactory,
    InteractionService,
    MapCooldownManager,
    ModuleService
} from "./index.js";
import {
    type API,
    type APIInteraction,
    type MappedEvents,
    type WithIntrinsicProps,
    GatewayDispatchEvents
} from "@discordjs/core";

import { type BaseLogger, Logger } from "@barry/logger";
import { type Server, StatusCodes } from "./Server.js";

import type { Gateway } from "./types.js";

import { EventEmitter } from "node:events";
import { WebSocketShardEvents } from "@discordjs/ws";

/**
 * A mapped type of all included default events.
 */
type IncludedEvents = Omit<MappedEvents, GatewayDispatchEvents.InteractionCreate>;

/**
 * A mapped type that extracts the intrinsic props from the values of a given mapped type.
 */
export type ClientEvents = {
    [K in keyof IncludedEvents]: MappedEvents[K] extends [WithIntrinsicProps<infer U>]
        ? [U]
        : MappedEvents[K];
} & {
    [GatewayDispatchEvents.InteractionCreate]: [AnyInteraction];
};

/**
 * Represents the main Client for Barry.
 */
export interface Client extends EventEmitter {
    /**
     * Emit an event with associated arguments.
     * @param event The name of the event to emit.
     * @param args The arguments to pass to the event listeners.
     */
    emit: (<K extends keyof ClientEvents>(event: K, ...args: ClientEvents[K]) => boolean) &
    (<S extends string | symbol>(event: Exclude<S, keyof ClientEvents>, ...args: any[]) => boolean);

    /**
     * Remove a listener from the given event.
     * @param event The name of the event to remove the listener from.
     * @param listener The listener function to remove.
     */
    off: (<K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => void) => this) &
    (<S extends string | symbol>(event: Exclude<S, keyof ClientEvents>, listener: (...args: any[]) => void) => this);

    /**
     * Add a listener for the given event.
     * @param event The name of the event to add the listener to.
     * @param listener The listener function to add.
     */
    on: (<K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => void) => this) &
    (<S extends string | symbol>(event: Exclude<S, keyof ClientEvents>, listener: (...args: any[]) => void) => this);

    /**
     * Add a one-time listener for the given event.
     * @param event The name of the event to add the listener to.
     * @param listener The listener function to add.
     */
    once: (<K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => void) => this) &
    (<S extends string | symbol>(event: Exclude<S, keyof ClientEvents>, listener: (...args: any[]) => void) => this);

    /**
     * Remove all listeners for the given event, or all listeners for all events.
     * @param event The name of the event to remove all listeners for. If not provided, remove all listeners for all events.
     */
    removeAllListeners: (<K extends keyof ClientEvents>(event?: K) => this) &
    (<S extends string | symbol>(event?: Exclude<S, keyof ClientEvents>) => this);
}

/**
 * Options for a {@link Client}.
 */
export interface BaseClientOptions {
    /**
     * An array of module classes to be added to the client.
     */
    modules: ConstructorArray<Module>;

    /**
     * The endpoint to listen for incoming interactions from Discord.
     */
    serverEndpoint: string;
}

/**
 * Options for a {@link Client}.
 */
export interface ClientOptions extends Partial<BaseClientOptions> {
    /**
     * A wrapper around REST that provides convenient methods for interacting with Discord's API.
     */
    api: API;

    /**
     * The ID of the application.
     */
    applicationID: string;

    /**
     * The gateway connection for receiving and sending real-time events.
     */
    gateway?: Gateway;

    /**
     * The logger used for logging messages.
     */
    logger?: BaseLogger;

    /**
     * A server instance used to receive incoming interactions.
     */
    server?: Server;
}

/**
 * Represents the main client for Barry.
 */
export class Client extends EventEmitter {
    /**
     * A wrapper around REST that provides convenient methods for interacting with Discord's API.
     */
    api: API;

    /**
     * The ID of the application.
     */
    applicationID: string;

    /**
     * The command service responsible for managing commands.
     */
    commands: CommandRegistry;

    /**
     * The cooldown manager that tracks cooldowns.
     */
    cooldowns: CooldownManager;

    /**
     * The gateway connection for receiving and sending real-time events.
     */
    gateway?: Gateway;

    /**
     * The handler that processes incoming interactions.
     */
    interactions: MiddlewareCapableHandler;

    /**
     * The logger used for logging messages.
     */
    logger: BaseLogger;

    /**
     * The module service responsible for managing modules.
     */
    modules: ModuleRegistry;

    /**
     * A server instance used to receive incoming interactions.
     */
    server?: Server;

    /**
     * Options for the client.
     */
    #options: BaseClientOptions;

    /**
     * Represents the main client for Barry.
     *
     * @param options Options for the client.
     */
    constructor(options: ClientOptions) {
        super();

        this.#options = {
            modules: options.modules ?? [],
            serverEndpoint: options.serverEndpoint ?? "/interactions"
        };

        this.api = options.api;
        this.applicationID = options.applicationID;
        this.gateway = options.gateway;
        this.logger = options.logger ?? new Logger({
            environment: process.env.NODE_ENV
        });
        this.server = options.server;

        this.commands = new CommandService(this);
        this.cooldowns = new MapCooldownManager();
        this.interactions = new InteractionService(this);
        this.modules = new ModuleService();

        this.gateway?.on(WebSocketShardEvents.Dispatch, ({ data }) => {
            if (data.t !== GatewayDispatchEvents.InteractionCreate) {
                return this.emit(data.t as any, data.d);
            }

            const interaction = InteractionFactory.from(data.d, this);

            this.emit(GatewayDispatchEvents.InteractionCreate, interaction);
            return this.interactions.handle(interaction);
        });

        this.server?.post(this.#options.serverEndpoint, async (body, respond) => {
            if (!this.#isInteraction(body)) {
                return respond({
                    body: { error: "Invalid request" },
                    status: StatusCodes.BAD_REQUEST
                });
            }

            const interaction = InteractionFactory.from(body, this, respond);

            this.emit(GatewayDispatchEvents.InteractionCreate, interaction);
            return this.interactions.handle(interaction);
        });
    }

    /**
     * Initializes the client.
     */
    async initialize(): Promise<void> {
        const modules = await this.#options.modules;
        await Promise.all(
            modules.map((ModuleClass) => this.modules.add(new ModuleClass(this)))
        );
    }

    /**
     * Checks whether the provided data represents an interaction.
     *
     * @param body The data to check.
     * @returns Whether the provided data represents an interaction.
     */
    #isInteraction(body: any): body is APIInteraction {
        return "id" in body && "application_id" in body && "type" in body && "token" in body;
    }
}
