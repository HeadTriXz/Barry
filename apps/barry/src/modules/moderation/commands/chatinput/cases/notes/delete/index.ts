import {
    type ApplicationCommandInteraction,
    SlashCommand,
    SlashCommandOptionBuilder
} from "@barry-bot/core";
import type ModerationModule from "../../../../../index.js";

import {
    InteractionContextType,
    MessageFlags,
    PermissionFlagsBits
} from "@discordjs/core";
import config from "../../../../../../../config.js";

/**
 * Options for the delete note options.
 */
export interface DeleteNoteOptions {
    /**
     * The ID of the case.
     */
    case: number;

    /**
     * The ID of the note.
     */
    note: number;
}

/**
 * The permissions needed to delete someone else's note.
 */
const BYPASS_PERMISSIONS = PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild;

/**
 * Represents a slash command that a note from a case.
 */
export default class extends SlashCommand<ModerationModule> {
    /**
     * Represents a slash command that a note from a case.
     *
     * @param module The module this command belongs to.
     */
    constructor(module: ModerationModule) {
        super(module, {
            name: "delete",
            description: "Removes a note from a case.",
            contexts: [InteractionContextType.Guild],
            defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
            options: {
                case: SlashCommandOptionBuilder.integer({
                    description: "The ID of the case.",
                    minimum: 1,
                    required: true
                }),
                note: SlashCommandOptionBuilder.integer({
                    description: "The ID of the note.",
                    minimum: 1,
                    required: true
                })
            }
        });
    }

    /**
     * Remove a note from a case.
     *
     * @param interaction The interaction that triggered the command.
     * @param options The options for the command.
     */
    async execute(interaction: ApplicationCommandInteraction, options: DeleteNoteOptions): Promise<void> {
        if (!interaction.isInvokedInGuild()) {
            return;
        }

        const entity = await this.module.cases.get(interaction.guildID, options.case, true);
        if (entity === null) {
            return interaction.createMessage({
                content: `${config.emotes.error} That case does not exist.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const note = entity.notes.find((n) => n.id === options.note);
        if (note === undefined) {
            return interaction.createMessage({
                content: `${config.emotes.error} That note does not exist.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const hasPermissions = (BigInt(interaction.member.permissions) & BYPASS_PERMISSIONS) !== 0n;
        if (!hasPermissions && note.creatorID !== interaction.user.id) {
            return interaction.createMessage({
                content: `${config.emotes.error} That is not your note.`,
                flags: MessageFlags.Ephemeral
            });
        }

        await this.module.caseNotes.delete(interaction.guildID, options.case, options.note);
        await interaction.createMessage({
            content: `${config.emotes.check} Successfully deleted note \`${options.note}\` from case \`${options.case}\`.`,
            flags: MessageFlags.Ephemeral
        });
    }
}
