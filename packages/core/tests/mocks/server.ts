import type { Server } from "../../src/index.js";

/**
 * Represents a mock server.
 */
export class MockServer implements Server {
    async close(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Starts listening on the specified host and port.
     *
     * @param port The port number to listen on.
     * @param host The hostname or IP address to listen on.
     */
    async listen(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Registers a handler for incoming POST requests to the specified path.
     *
     * @param path The path to handle.
     * @param callback The handler for incoming requests to the specified path.
     * @returns The server instance, for chaining.
     */
    post(): this {
        return this;
    }
}
