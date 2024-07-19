import type ModerationModule from "../../../../index.js";

import { InteractionContextType, PermissionFlagsBits } from "@discordjs/core";
import { SlashCommand } from "@barry-bot/core";
import AddNoteCommand from "./add/index.js";
import DeleteNoteCommand from "./delete/index.js";
import EditNoteCommand from "./edit/index.js";

/**
 * Represents a slash command to manage notes on a case.
 */
export default class extends SlashCommand<ModerationModule> {
    /**
     * Represents a slash command to manage notes on a case.
     *
     * @param module The module this command belongs to.
     */
    constructor(module: ModerationModule) {
        super(module, {
            name: "notes",
            description: "Modify or add notes to a case.",
            contexts: [InteractionContextType.Guild],
            defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
            children: [
                AddNoteCommand,
                DeleteNoteCommand,
                EditNoteCommand
            ]
        });
    }

    /**
     * Executes the '/cases notes' command. Will throw an error if executed.
     */
    execute(): Promise<void> {
        throw new Error("Method not implemented.");
    }
}
