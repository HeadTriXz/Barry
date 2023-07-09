import type { API } from "@discordjs/core";
import { Client } from "@barry/core";

/**
 * Creates a new mock client instance.
 *
 * @param override Partial override for client options.
 * @returns The new mock client.
 */
export function createMockClient(override: Record<string, any> = {}): Client {
    return new Client({
        api: {} as API,
        applicationID: "49072635294295155",
        ...override
    });
}
