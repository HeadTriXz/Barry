import { type AnyInteraction, Event, getCreatedAt } from "@barry/core";
import type RequestsModule from "../index.js";

import {
    ButtonStyle,
    ComponentType,
    GatewayDispatchEvents,
    MessageFlags
} from "@discordjs/core";
import { ManageRequestButton } from "../index.js";
import { timeoutContent } from "../../../constants.js";

import config from "../../../../../config.js";

/**
 * How long it takes (in milliseconds) until a request can be posted again.
 */
const COOLDOWN = 24 * 60 * 60 * 1000;

/**
 * Represents an event handler for posting a request.
 */
export default class extends Event<RequestsModule> {
    /**
     * Represents an event handler for posting a request.
     *
     * @param module The module the event belongs to.
     */
    constructor(module: RequestsModule) {
        super(module, GatewayDispatchEvents.InteractionCreate);
    }

    /**
     * Handles the interaction triggered by the 'Post Request' button.
     *
     * @param interaction The interaction that triggered the button.
     */
    async execute(interaction: AnyInteraction): Promise<void> {
        const isValidInteraction = interaction.isInvokedInGuild()
            && interaction.isMessageComponent()
            && interaction.data.isButton()
            && interaction.data.customID === ManageRequestButton.Post;

        if (!isValidInteraction) {
            return;
        }

        const settings = await this.module.settings.getOrCreate(interaction.guildID);
        if (!settings.enabled) {
            return interaction.createMessage({
                content: `${config.emotes.error} Requests are currently disabled for this guild.`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (settings.channelID === null) {
            return interaction.createMessage({
                content: `${config.emotes.error} This guild hasn't setup their channel for requests.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const requests = await this.module.requests.getAvailableByUser(interaction.user.id);
        if (requests.length === 0) {
            return interaction.createMessage({
                components: [{
                    components: [{
                        custom_id: ManageRequestButton.Create,
                        label: "Create Request",
                        style: ButtonStyle.Success,
                        type: ComponentType.Button
                    }],
                    type: ComponentType.ActionRow
                }],
                content: "You don't have a request yet. Would you like to create one?",
                flags: MessageFlags.Ephemeral
            });
        }

        const formatter = new Intl.DateTimeFormat("en-US", {
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
            month: "long",
            year: "numeric"
        });

        await interaction.createMessage({
            components: [
                {
                    components: [{
                        custom_id: "post_specific_request",
                        options: requests.map((request) => ({
                            description: `Last updated on ${formatter.format(request.updatedAt)}`,
                            label: `[${request.id}] ${request.title}`,
                            value: request.id.toString()
                        })),
                        type: ComponentType.StringSelect
                    }],
                    type: ComponentType.ActionRow
                },
                {
                    components: [{
                        custom_id: ManageRequestButton.Create,
                        label: "Create Request",
                        style: ButtonStyle.Success,
                        type: ComponentType.Button
                    }],
                    type: ComponentType.ActionRow
                }
            ],
            content: `### ${config.emotes.add} Which request would you like to post?`,
            flags: MessageFlags.Ephemeral
        });

        const response = await interaction.awaitMessageComponent({
            customIDs: ["post_specific_request"]
        });

        if (!response?.data.isStringSelect()) {
            return interaction.editParent(timeoutContent);
        }

        const value = Number(response.data.values[0]);
        const request = requests.find((request) => request.id === value);
        if (request === undefined) {
            return response.editParent({
                components: [],
                content: `${config.emotes.error} Failed to find the request you're looking for.`
            });
        }

        if (!this.module.isValidCompensation(request.compensation, settings.minCompensation)) {
            return response.editParent({
                components: [],
                content: `${config.emotes.error} The compensation must be at least $${settings.minCompensation}.`
            });
        }

        const message = await this.module.requestMessages.getLatest(interaction.guildID, request.id);
        if (message !== null) {
            const expiresAt = getCreatedAt(message.messageID) + COOLDOWN;
            if (expiresAt > Date.now()) {
                return response.editParent({
                    components: [],
                    content: `${config.emotes.error} You can post again <t:${Math.trunc(expiresAt / 1000)}:R>.`
                });
            }
        }

        await this.module.postRequest(interaction.user, request, settings);
        await response.editParent({
            components: [],
            content: `${config.emotes.check} Successfully posted your request!`,
            flags: MessageFlags.Ephemeral
        });
    }
}
