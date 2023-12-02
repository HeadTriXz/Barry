import type { Application } from "../../Application.js";

import { Module } from "@barry-bot/core";
import { loadCommands } from "../../utils/index.js";

/**
 * Represents the general module.
 */
export default class GeneralModule extends Module<Application> {
    /**
     * Represents the general module.
     *
     * @param client The client that initialized the module.
     */
    constructor(client: Application) {
        super(client, {
            id: "general",
            name: "General",
            description: "Provides general functionality and commands.",
            commands: loadCommands("./commands")
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
