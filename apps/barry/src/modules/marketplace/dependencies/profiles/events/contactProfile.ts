import { type AnyInteraction, Event } from "@barry/core";
import type ProfilesModule from "../index.js";

import { GatewayDispatchEvents, MessageFlags } from "@discordjs/core";
import { ProfileActionButton } from "../index.js";

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

        const settings = await this.module.profilesSettings.getOrCreate(interaction.guildID);
        if (!settings.enabled) {
            return interaction.createMessage({
                content: `${config.emotes.error} Profiles are currently disabled for this guild.`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (settings.channelID === null) {
            return interaction.createMessage({
                content: `${config.emotes.error} This guild hasn't setup their channel for profiles.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const profile = await this.module.profiles.getByMessage(interaction.message.id);
        if (profile === null) {
            return interaction.createMessage({
                content: `${config.emotes.error} I don't have access to that profile.`,
                flags: MessageFlags.Ephemeral
            });
        }

        await this.module.displayContact(interaction, profile);
    }
}
