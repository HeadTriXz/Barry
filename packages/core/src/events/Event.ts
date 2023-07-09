import type { Client, ClientEvents } from "../Client.js";
import type { Module } from "../index.js";

/**
 * Represents the type of events that can be emitted by the client.
 */
export type Emittable = keyof ClientEvents;

/**
 * Represents an event that can be emitted and handled by the client.
 *
 * @template M The type of the module that owns the event.
 * @template K The type of the event name.
 * @abstract
 */
export abstract class Event<M extends Module = Module, K extends Emittable = Emittable> {
    /**
     * The client that initialized the event.
     */
    client: Client;

    /**
     * The module that owns the event.
     */
    module: M;

    /**
     * The name of the event.
     */
    name: K;

    /**
     * Represents an event that can be emitted and handled by the client.
     *
     * @param module The module that owns the event.
     * @param name The name of the event.
     */
    constructor(module: M, name: K) {
        this.client = module.client;
        this.module = module;
        this.name = name;
    }

    /**
     * Executes the event handler with the provided arguments.
     *
     * @param args The arguments passed to the event handler.
     */
    abstract execute(...args: ClientEvents[K]): Promise<void>;
}
