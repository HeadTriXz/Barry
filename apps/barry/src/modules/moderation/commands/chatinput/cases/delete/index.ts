import {
    type ApplicationCommandInteraction,
    SlashCommand,
    SlashCommandOptionBuilder
} from "@barry-bot/core";
import type ModerationModule from "../../../../index.js";

import {
    ButtonStyle,
    ComponentType,
    InteractionContextType,
    MessageFlags,
    PermissionFlagsBits
} from "@discordjs/core";
import { getCaseContent } from "../content.js";
import config from "../../../../../../config.js";

/**
 * Options for the "/cases delete" command.
 */
export interface DeleteCasesOptions {
    /**
     * The ID of the case to delete.
     */
    case: number;
}

/**
 * Represents a slash command to delete a specific case.
 */
export default class extends SlashCommand<ModerationModule> {
    /**
     * Represents a slash command to delete a specific case.
     *
     * @param module The module that this command belongs to.
     */
    constructor(module: ModerationModule) {
        super(module, {
            name: "delete",
            description: "Delete a specific case.",
            contexts: [InteractionContextType.Guild],
            defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
            options: {
                case: SlashCommandOptionBuilder.integer({
                    description: "The ID of the case to delete.",
                    minimum: 1,
                    required: true
                })
            }
        });
    }

    /**
     * Delete a specific case.
     *
     * @param interaction The interaction that triggered the command.
     * @param options The options for the command.
     */
    async execute(interaction: ApplicationCommandInteraction, options: DeleteCasesOptions): Promise<void> {
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

        const creator = await this.client.api.users.get(entity.creatorID);
        const user = await this.client.api.users.get(entity.userID);

        await interaction.createMessage({
            ...getCaseContent(entity, entity.notes.slice(0, 4), creator, user),
            components: [{
                components: [
                    {
                        custom_id: "confirm",
                        label: "Confirm",
                        style: ButtonStyle.Danger,
                        type: ComponentType.Button
                    },
                    {
                        custom_id: "cancel",
                        label: "Cancel",
                        style: ButtonStyle.Secondary,
                        type: ComponentType.Button
                    }
                ],
                type: ComponentType.ActionRow
            }],
            content: `### ${config.emotes.error} Are you sure you want to delete this case?`,
            flags: MessageFlags.Ephemeral
        });

        const response = await interaction.awaitMessageComponent({
            customIDs: ["confirm", "cancel"]
        });

        if (response === undefined) {
            await interaction.editOriginalMessage({
                components: [],
                content: `${config.emotes.error} It took you too long to respond. Please try again.`,
                embeds: [],
                flags: MessageFlags.Ephemeral
            });

            return;
        }

        if (response.data.customID === "cancel") {
            return response.editParent({
                components: [],
                content: `${config.emotes.check} Cancelled the deletion of case \`${options.case}\`.`,
                embeds: [],
                flags: MessageFlags.Ephemeral
            });
        }

        if (response.data.customID === "confirm") {
            await this.module.cases.delete(interaction.guildID, options.case);

            return response.editParent({
                components: [],
                content: `${config.emotes.check} Successfully deleted case \`${options.case}\`.`,
                embeds: [],
                flags: MessageFlags.Ephemeral
            });
        }
    }
}
