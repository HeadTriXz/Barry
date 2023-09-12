import type ModerationModule from "../../../../index.js";

import { PermissionFlagsBits } from "@discordjs/core";
import { SlashCommand } from "@barry/core";
import AddNoteCommand from "./add/index.js";
import DeleteNoteCommand from "./delete/index.js";

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
            defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
            guildOnly: true,
            children: [AddNoteCommand, DeleteNoteCommand]
        });
    }

    /**
     * Executes the '/cases notes' command. Will throw an error if executed.
     */
    execute(): Promise<void> {
        throw new Error("Method not implemented.");
    }
}
