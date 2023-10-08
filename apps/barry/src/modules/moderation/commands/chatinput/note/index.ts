import {
    type APIUser,
    MessageFlags,
    PermissionFlagsBits
} from "@discordjs/core";
import {
    type ApplicationCommandInteraction,
    SlashCommand,
    SlashCommandOptionBuilder
} from "@barry/core";
import type ModerationModule from "../../../index.js";

import { CaseType } from "@prisma/client";
import config from "../../../../../config.js";

/**
 * Options for the note command.
 */
export interface NoteOptions {
    /**
     * The content of the note.
     */
    note: string;

    /**
     * The user to add a note to.
     */
    user: APIUser;
}

/**
 * Represents a slash command that adds a note to a user.
 */
export default class extends SlashCommand<ModerationModule> {
    /**
     * Represents a slash command that adds a note to a user.
     *
     * @param module The module this command belongs to.
     */
    constructor(module: ModerationModule) {
        super(module, {
            name: "note",
            description: "Adds a note to a user.",
            defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
            guildOnly: true,
            options: {
                user: SlashCommandOptionBuilder.user({
                    description: "The user to add a note to.",
                    required: true
                }),
                note: SlashCommandOptionBuilder.string({
                    description: "The content of the note.",
                    maximum: 200,
                    required: true
                })
            }
        });
    }

    /**
     * Adds a note to a user.
     *
     * @param interaction The interaction that triggered the command.
     * @param options The options for the command.
     */
    async execute(interaction: ApplicationCommandInteraction, options: NoteOptions): Promise<void> {
        if (!interaction.isInvokedInGuild()) {
            return;
        }

        const entity = await this.module.cases.create({
            creatorID: interaction.user.id,
            guildID: interaction.guildID,
            note: options.note,
            type: CaseType.Note,
            userID: options.user.id
        });

        await interaction.createMessage({
            content: `${config.emotes.check} Case \`${entity.id}\` | Successfully added a note to \`${options.user.username}\`.`,
            flags: MessageFlags.Ephemeral
        });

        const settings = await this.module.settings.getOrCreate(interaction.guildID);
        if (settings.channelID !== null) {
            await this.module.createLogMessage(settings.channelID, {
                case: entity,
                creator: interaction.user,
                reason: options.note,
                user: options.user
            });
        }
    }
}
