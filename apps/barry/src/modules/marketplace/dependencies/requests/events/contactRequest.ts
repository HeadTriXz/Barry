import { type AnyInteraction, Event } from "@barry-bot/core";
import type RequestsModule from "../index.js";

import { GatewayDispatchEvents, MessageFlags } from "@discordjs/core";
import { RequestActionButton } from "../index.js";
import { displayContact } from "../../../utils.js";
import config from "../../../../../config.js";

/**
 * Represents an event handler for the 'Contact' button interaction on requests.
 */
export default class extends Event<RequestsModule> {
    /**
     * Represents an event handler for the 'Contact' button interaction on requests.
     *
     * @param module The module the event belongs to.
     */
    constructor(module: RequestsModule) {
        super(module, GatewayDispatchEvents.InteractionCreate);
    }

    /**
     * Displays the contact information of a request.
     *
     * @param interaction The interaction that triggered the 'Contact' button.
     */
    async execute(interaction: AnyInteraction): Promise<void> {
        const isValidInteraction = interaction.isInvokedInGuild()
            && interaction.isMessageComponent()
            && interaction.data.isButton()
            && interaction.data.customID === RequestActionButton.Contact;

        if (!isValidInteraction) {
            return;
        }

        const request = await this.module.requests.getByMessage(interaction.message.id);
        if (request === null) {
            return interaction.createMessage({
                content: `${config.emotes.error} Failed to find the request you're looking for.`,
                flags: MessageFlags.Ephemeral
            });
        }

        await displayContact(interaction, request);
    }
}
