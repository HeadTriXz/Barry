import type GeneralModule from "../../../index.js";

import { SlashCommand } from "@barry-bot/core";
import ReverseImageCommand from "./image/index.js";

/**
 * Represents a slash command for reverse searching an image.
 */
export default class extends SlashCommand<GeneralModule> {
    /**
     * Represents a slash command for reverse searching an image.
     *
     * @param module The module this command belongs to.
     */
    constructor(module: GeneralModule) {
        super(module, {
            name: "reverse",
            description: "Reverse search an image.",
            children: [ReverseImageCommand]
        });
    }

    /**
     * Executes the "/reverse" command. Will throw an error if executed.
     */
    execute(): Promise<void> {
        throw new Error("Parent commands cannot be executed.");
    }
}
