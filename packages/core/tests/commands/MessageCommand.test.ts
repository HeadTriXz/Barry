import { type API, ApplicationCommandType } from "@discordjs/core";
import { type Module, Client } from "../../src/index.js";

import { beforeEach, describe, expect, it } from "vitest";
import { MockMessageCommand, MockModule } from "../mocks/index.js";

describe("MessageCommand", () => {
    let client: Client;
    let module: Module;

    beforeEach(() => {
        client = new Client({
            api: {} as API,
            applicationID: "49072635294295155"
        });

        module = new MockModule(client);
    });

    describe("type", () => {
        it("should be of type 'MESSAGE'", () => {
            const command = new MockMessageCommand(module, {
                name: "test"
            });

            expect(command.type).toBe(ApplicationCommandType.Message);
        });
    });
});
