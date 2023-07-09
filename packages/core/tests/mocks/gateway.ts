import type { Awaitable, Gateway } from "../../src/types.js";

/**
 * Represents a mock gateway connection.
 */
export class MockGateway implements Gateway {
    /**
     * Establishes a connection to the gateway.
     */
    connect(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Retrieves the number of shards for the gateway connection.
     *
     * @returns The number of shards.
     */
    getShardCount(): Promise<number> {
        return Promise.resolve(1);
    }

    /**
     * Registers an event listener for a specific event.
     *
     * @param event The event to listen for.
     * @param listener The listener function to be called when the event is emitted.
     * @returns The gateway instance for method chaining.
     */
    on(): this {
        return this;
    }

    /**
     * Sends a payload to the specified shard.
     *
     * @param shardID The ID of the target shard.
     * @param payload The payload to be sent.
     */
    send(): Awaitable<void> {
        return Promise.resolve();
    }
}
