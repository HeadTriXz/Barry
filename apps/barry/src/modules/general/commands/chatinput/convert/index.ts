import type GeneralModule from "../../../index.js";

import { SlashCommand } from "@barry/core";
import ConvertCurrencyCommand from "./currency/index.js";
import ConvertUnitCommand from "./unit/index.js";

/**
 * Represents a slash command for converting one unit to another.
 */
export default class extends SlashCommand<GeneralModule> {
    /**
     * Represents a slash command for converting one unit to another.
     *
     * @param module The module this command belongs to.
     */
    constructor(module: GeneralModule) {
        super(module, {
            name: "convert",
            description: "Converts one unit to another.",
            children: [
                ConvertCurrencyCommand,
                ConvertUnitCommand
            ]
        });
    }

    /**
     * Executes the '/convert' command. Will throw an error if executed.
     */
    execute(): Promise<void> {
        throw new Error("Parent commands cannot be executed.");
    }
}
