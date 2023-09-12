import {
    type ApplicationCommandInteraction,
    SlashCommand,
    SlashCommandOptionBuilder
} from "@barry/core";
import type ModerationModule from "../../../../../index.js";

import { MessageFlags, PermissionFlagsBits } from "@discordjs/core";
import config from "../../../../../../../config.js";

/**
 * Options for the add note command.
 */
export interface AddNoteOptions {
    /**
     * The ID of the case.
     */
    case: number;

    /**
     * The content of the new note.
     */
    content: string;
}

/**
 * Represents a slash command that adds a note to a case.
 */
export default class extends SlashCommand<ModerationModule> {
    /**
     * Represents a slash command that adds a note to a case.
     *
     * @param module The module this command belongs to.
     */
    constructor(module: ModerationModule) {
        super(module, {
            name: "add",
            description: "Adds a note to a case.",
            defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
            guildOnly: true,
            options: {
                case: SlashCommandOptionBuilder.integer({
                    description: "The ID of the case.",
                    minimum: 1,
                    required: true
                }),
                content: SlashCommandOptionBuilder.string({
                    description: "The content of the new note.",
                    maximum: 200,
                    required: true
                })
            }
        });
    }

    /**
     * Add a new note to a case.
     *
     * @param interaction The interaction that triggered the command.
     * @param options The options for the command.
     */
    async execute(interaction: ApplicationCommandInteraction, options: AddNoteOptions): Promise<void> {
        if (!interaction.isInvokedInGuild()) {
            return;
        }

        const entity = await this.module.cases.get(interaction.guildID, options.case);
        if (entity === null) {
            return interaction.createMessage({
                content: `${config.emotes.error} That case does not exist.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const note = await this.module.caseNotes.create({
            caseID: options.case,
            content: options.content,
            creatorID: interaction.user.id,
            guildID: interaction.guildID
        });

        await interaction.createMessage({
            content: `${config.emotes.check} Successfully added note \`${note.id}\` to case \`${options.case}\`.`,
            flags: MessageFlags.Ephemeral
        });
    }
}
