import type { Application } from "../../Application.js";
import type { MarketplaceSettings } from "@prisma/client";
import type { ModuleWithSettings } from "../../types/modules.js";

import { MarketplaceSettingsRepository } from "./database/MarketplaceSettingsRepository.js";
import { Module } from "@barry/core";
import { loadModules } from "../../utils/index.js";

/**
 * Represents the marketplace module.
 */
export default class MarketplaceModule extends Module<Application> implements ModuleWithSettings<MarketplaceSettings> {
    /**
     * Represents a repository for managing settings of this module.
     */
    settings: MarketplaceSettingsRepository;

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

        this.settings = new MarketplaceSettingsRepository(client.prisma);
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
