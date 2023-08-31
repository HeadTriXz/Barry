import { type API, ApplicationCommandType } from "@discordjs/core";
import { type Module, Client } from "../../src/index.js";

import { MockModule, MockUserCommand } from "../mocks/index.js";

describe("UserCommand", () => {
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
        it("should be of type 'USER'", () => {
            const command = new MockUserCommand(module, {
                name: "test"
            });

            expect(command.type).toBe(ApplicationCommandType.User);
        });
    });
});
