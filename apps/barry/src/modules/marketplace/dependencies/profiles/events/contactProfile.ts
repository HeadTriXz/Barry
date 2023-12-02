import { type AnyInteraction, Event } from "@barry-bot/core";
import type ProfilesModule from "../index.js";

import { GatewayDispatchEvents, MessageFlags } from "@discordjs/core";
import { ProfileActionButton } from "../index.js";
import { displayContact } from "../../../utils.js";

import config from "../../../../../config.js";

/**
 * Represents an event handler for the 'Contact' button interaction on profiles.
 */
export default class extends Event<ProfilesModule> {
    /**
     * Represents an event handler for the 'Contact' button interaction on profiles.
     *
     * @param module The module the event belongs to.
     */
    constructor(module: ProfilesModule) {
        super(module, GatewayDispatchEvents.InteractionCreate);
    }

    /**
     * Displays the contact information of a profile.
     *
     * @param interaction The interaction that triggered the 'Contact' button.
     */
    async execute(interaction: AnyInteraction): Promise<void> {
        const isValidInteraction = interaction.isInvokedInGuild()
            && interaction.isMessageComponent()
            && interaction.data.isButton()
            && interaction.data.customID === ProfileActionButton.Contact;

        if (!isValidInteraction) {
            return;
        }

        const profile = await this.module.profiles.getByMessage(interaction.message.id);
        if (profile === null) {
            return interaction.createMessage({
                content: `${config.emotes.error} Failed to find the profile you're looking for.`,
                flags: MessageFlags.Ephemeral
            });
        }

        await displayContact(interaction, profile);
    }
}
