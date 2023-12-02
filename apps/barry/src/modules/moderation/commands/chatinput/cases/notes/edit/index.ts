import {
    type ApplicationCommandInteraction,
    SlashCommand,
    SlashCommandOptionBuilder
} from "@barry-bot/core";
import type ModerationModule from "../../../../../index.js";

import { MessageFlags, PermissionFlagsBits } from "@discordjs/core";
import config from "../../../../../../../config.js";

/**
 * Options for the edit note command.
 */
export interface EditNoteOptions {
    /**
     * The ID of the case.
     */
    case: number;

    /**
     * The new content of the note.
     */
    content: string;

    /**
     * The ID of the note.
     */
    note: number;
}

/**
 * Represents a slash command that edits the content of a note.
 */
export default class extends SlashCommand<ModerationModule> {
    /**
     * Represents a slash command that edits the content of a note.
     *
     * @param module The module this command belongs to.
     */
    constructor(module: ModerationModule) {
        super(module, {
            name: "edit",
            description: "Edits the content of a note.",
            defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
            guildOnly: true,
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
                }),
                content: SlashCommandOptionBuilder.string({
                    description: "The new content of the note.",
                    maximum: 200,
                    required: true
                })
            }
        });
    }

    /**
     * Edits the content of a note.
     *
     * @param interaction The interaction that triggered the command.
     * @param options The options for the command.
     */
    async execute(interaction: ApplicationCommandInteraction, options: EditNoteOptions): Promise<void> {
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

        if (note.creatorID !== interaction.user.id) {
            return interaction.createMessage({
                content: `${config.emotes.error} That is not your note.`,
                flags: MessageFlags.Ephemeral
            });
        }

        await this.module.caseNotes.update(interaction.guildID, options.case, options.note, {
            content: options.content
        });

        await interaction.createMessage({
            content: `${config.emotes.check} Successfully edited note \`${note.id}\` of case \`${options.case}\`.`,
            flags: MessageFlags.Ephemeral
        });
    }
}
