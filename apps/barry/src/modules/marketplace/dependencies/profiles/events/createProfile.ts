import { type AnyInteraction, Event } from "@barry/core";
import type ProfilesModule from "../index.js";

import { GatewayDispatchEvents } from "@discordjs/core";
import { ProfileEditor } from "../editor/ProfileEditor.js";
import { ManageProfileButton } from "../index.js";

import config from "../../../../../config.js";

/**
 * Represents an event handler for creating a profile.
 */
export default class extends Event<ProfilesModule> {
    /**
     * Represents an event handler for creating a profile.
     *
     * @param module The module the event belongs to.
     */
    constructor(module: ProfilesModule) {
        super(module, GatewayDispatchEvents.InteractionCreate);
    }

    /**
     * Handles the interaction triggered by the 'Create Profile' button.
     *
     * @param interaction The interaction that triggered the button.
     */
    async execute(interaction: AnyInteraction): Promise<void> {
        const isValidInteraction = interaction.isInvokedInGuild()
            && interaction.isMessageComponent()
            && interaction.data.isButton()
            && interaction.data.customID === ManageProfileButton.Create;

        if (!isValidInteraction) {
            return;
        }

        const settings = await this.module.profilesSettings.getOrCreate(interaction.guildID);
        if (!settings.enabled) {
            return interaction.editParent({
                content: `${config.emotes.error} Profiles are currently disabled for this guild.`
            });
        }

        if (settings.channelID === null) {
            return interaction.editParent({
                content: `${config.emotes.error} This guild hasn't setup their channel for profiles.`
            });
        }

        const profile = await this.module.profiles.get(interaction.user.id);
        if (profile?.creationStatus === null) {
            return interaction.editParent({
                content: `${config.emotes.error} You already have a profile, use \`Edit Profile\` instead.`
            });
        }

        const editor = new ProfileEditor(this.module, false, profile || undefined);
        await editor.next(interaction);
    }
}
