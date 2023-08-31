import { createMockApplication } from "../../mocks/application.js";
import MarketplaceModule from "../../../src/modules/marketplace/index.js";

describe("MarketplaceModule", () => {
    let module: MarketplaceModule;

    beforeEach(() => {
        const client = createMockApplication();
        module = new MarketplaceModule(client);
    });

    describe("isEnabled", () => {
        it("should always be enabled", () => {
            const isEnabled = module.isEnabled();

            expect(isEnabled).toBe(true);
        });
    });
});
