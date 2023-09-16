import {
    type APIMessage,
    type APIUser,
    MessageFlags,
    PermissionFlagsBits
} from "@discordjs/core";
import {
    type ApplicationCommandInteraction,
    SlashCommand,
    SlashCommandOptionBuilder,
    getCreatedAt
} from "@barry/core";
import type ModerationModule from "../../../index.js";

import config from "../../../../../config.js";

/**
 * Options for the purge command.
 */
export interface PurgeOptions {
    /**
     * The amount of messages to purge.
     */
    amount: number;

    /**
     * The user to purge messages from.
     */
    user?: APIUser;
}

/**
 * The maximum age of a message in milliseconds (14 days).
 */
const MAX_MESSAGE_AGE = 1209600000;

/**
 * Represents a slash command that purges messages from a channel.
 */
export default class extends SlashCommand<ModerationModule> {
    /**
     * Represents a slash command that purges messages from a channel.
     *
     * @param module The module this command belongs to.
     */
    constructor(module: ModerationModule) {
        super(module, {
            name: "purge",
            description: "Purge messages from the current channel.",
            appPermissions: PermissionFlagsBits.ManageMessages,
            defaultMemberPermissions: PermissionFlagsBits.ManageMessages,
            guildOnly: true,
            options: {
                amount: SlashCommandOptionBuilder.integer({
                    description: "The amount of messages to purge.",
                    minimum: 2,
                    maximum: 100,
                    required: true
                }),
                user: SlashCommandOptionBuilder.user({
                    description: "The user to purge messages from."
                })
            }
        });
    }

    /**
     * Purges messages from the current channel.
     *
     * @param interaction The interaction that triggered this command.
     * @param options The options for the command.
     */
    async execute(interaction: ApplicationCommandInteraction, options: PurgeOptions): Promise<void> {
        if (!interaction.isInvokedInGuild() || interaction.channel === undefined) {
            return;
        }

        const limit = options.user !== undefined
            ? 100
            : options.amount;

        const messages = await this.client.api.channels.getMessages(interaction.channel.id, { limit });
        const messageIDs: string[] = [];
        for (const message of messages) {
            if (messageIDs.length >= options.amount) {
                break;
            }

            if (this.isPrunable(message, options.user?.id)) {
                messageIDs.push(message.id);
            }
        }

        if (messageIDs.length === 0) {
            return interaction.createMessage({
                content: `${config.emotes.error} There are no messages to purge.`,
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            if (messageIDs.length === 1) {
                await this.client.api.channels.deleteMessage(interaction.channel.id, messageIDs[0]);
            } else {
                await this.client.api.channels.bulkDeleteMessages(interaction.channel.id, messageIDs);
            }
        } catch (error: unknown) {
            this.client.logger.error(error);

            return interaction.createMessage({
                content: `${config.emotes.error} Failed to purge the messages.`,
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.createMessage({
            content: `${config.emotes.check} Successfully deleted ${messageIDs.length} messages.`,
            flags: MessageFlags.Ephemeral
        });
    }

    /**
     * Checks whether a message is prunable.
     *
     * @param message The message to check.
     * @param userID Optionally, the only allowed author.
     * @returns Whether the message is prunable.
     */
    isPrunable(message: APIMessage, userID?: string): boolean {
        if (message.pinned) {
            return false;
        }

        if (getCreatedAt(message.id) < Date.now() - MAX_MESSAGE_AGE) {
            return false;
        }

        return userID === undefined || message.author.id === userID;
    }
}
