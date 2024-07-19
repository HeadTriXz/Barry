import type ModerationModule from "../../../index.js";

import { InteractionContextType } from "@discordjs/core";
import { SlashCommand } from "@barry-bot/core";
import DeleteCommand from "./delete/index.js";
import NoteCommand from "./notes/index.js";
import ViewCommand from "./view/index.js";

/**
 * Represents a slash command to manage cases.
 */
export default class extends SlashCommand<ModerationModule> {
    /**
     * Represents a slash command to manage cases.
     *
     * @param module The module this command belongs to.
     */
    constructor(module: ModerationModule) {
        super(module, {
            name: "cases",
            description: "Manage or view a case.",
            contexts: [InteractionContextType.Guild],
            children: [
                DeleteCommand,
                NoteCommand,
                ViewCommand
            ]
        });
    }

    /**
     * Executes the '/cases' command. Will throw an error if executed.
     */
    execute(): Promise<void> {
        throw new Error("Method not implemented.");
    }
}
