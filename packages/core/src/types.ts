import type { ManagerShardEventsMap, WebSocketShardEvents } from "@discordjs/ws";
import type { GatewaySendPayload } from "@discordjs/core";

/**
 * Represents a type that may be awaited like a Promise, or returned synchronously.
 */
export type Awaitable<T> = T | PromiseLike<T>;

/**
 * Represents a constructor of an abstract class.
 */
export type AbstractConstructor<T> = abstract new (...args: any[]) => T;

/**
 * Represents a constructor of a class.
 */
export type ConcreteConstructor<T> = new (...args: any[]) => T;

/**
 * Represents a constructor that can create an instances of a class.
 */
export type Constructor<T> = T extends { prototype: infer U }
    ? ConcreteConstructor<U>
    : AbstractConstructor<T>;

/**
 * Represents a gateway connection for receiving and sending real-time events.
 */
export interface Gateway {
    /**
     * Establishes a connection to the gateway.
     */
    connect(): Promise<void>;

    /**
     * Retrieves the number of shards for the gateway connection.
     *
     * @returns The number of shards.
     */
    getShardCount(): Promise<number>;

    /**
     * Registers an event listener for a specific event.
     *
     * @param event The event to listen for.
     * @param listener The listener function to be called when the event is emitted.
     * @returns The gateway instance for method chaining.
     */
    on(
      event: WebSocketShardEvents.Dispatch,
      listener: (...params: ManagerShardEventsMap[WebSocketShardEvents.Dispatch]) => void,
    ): this;

    /**
     * Sends a payload to the specified shard.
     *
     * @param shardID The ID of the target shard.
     * @param payload The payload to be sent.
     */
    send(shardID: number, payload: GatewaySendPayload): Awaitable<void>;
}
