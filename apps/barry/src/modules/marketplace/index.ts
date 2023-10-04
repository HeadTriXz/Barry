import type { Application } from "../../Application.js";

import { Module } from "@barry/core";
import { loadModules } from "../../utils/index.js";

/**
 * Represents the marketplace module.
 */
export default class MarketplaceModule extends Module<Application> {
    /**
     * Represents the marketplace module.
     *
     * @param client The client that initialized the module.
     */
    constructor(client: Application) {
        super(client, {
            id: "marketplace",
            name: "Marketplace",
            description: "Allows users to showcase their services and request services from others.",
            dependencies: loadModules("./dependencies")
        });
    }

    /**
     * Checks if the guild has enabled this module.
     *
     * @returns Whether the guild has enabled this module.
     */
    isEnabled(): boolean {
        return true;
    }
}
