import { BlacklistedGuildRepository } from "../../../src/modules/developers/database/BlacklistedGuildRepository.js";
import { BlacklistedUserRepository } from "../../../src/modules/developers/database/BlacklistedUserRepository.js";
import { createMockApplication } from "../../mocks/application.js";
import DevelopersModule from "../../../src/modules/developers/index.js";

describe("DevelopersModule", () => {
    let module: DevelopersModule;

    beforeEach(() => {
        const client = createMockApplication();
        module = new DevelopersModule(client);
    });

    describe("constructor", () => {
        it("should set up the repositories correctly", () => {
            expect(module.blacklistedGuilds).toBeInstanceOf(BlacklistedGuildRepository);
            expect(module.blacklistedUsers).toBeInstanceOf(BlacklistedUserRepository);
        });
    });
});
