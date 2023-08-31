import { type API, GatewayDispatchEvents } from "@discordjs/core";
import { type Module, Client } from "../../src/index.js";

import { Event } from "../../src/events/index.js";
import { MockModule } from "../mocks/index.js";

class MockEvent extends Event {
    async execute(): Promise<void> {
        // empty...
    }
}

describe("Event", () => {
    let client: Client;
    let module: Module;

    beforeEach(() => {
        client = new Client({
            api: {} as API,
            applicationID: "49072635294295155"
        });

        module = new MockModule(client);
    });

    describe("constructor", () => {
        it("should initialize the event with the provided options", () => {
            const event = new MockEvent(module, GatewayDispatchEvents.Ready);

            expect(event.client).toBe(client);
            expect(event.module).toBe(module);
            expect(event.name).toBe(GatewayDispatchEvents.Ready);
        });
    });
});
