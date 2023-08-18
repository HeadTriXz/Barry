import { type AnyInteraction, Event, getCreatedAt } from "@barry/core";
import type ProfilesModule from "../index.js";

import {
    ButtonStyle,
    ComponentType,
    GatewayDispatchEvents,
    MessageFlags
} from "@discordjs/core";
import { ManageProfileButton } from "../index.js";

import config from "../../../../../config.js";

/**
 * How long it takes (in milliseconds) until a profile can be posted again.
 */
const COOLDOWN = 24 * 60 * 60 * 1000;

/**
 * Represents an event handler for posting a profile.
 */
export default class extends Event<ProfilesModule> {
    /**
     * Represents an event handler for posting a profile.
     *
     * @param module The module the event belongs to.
     */
    constructor(module: ProfilesModule) {
        super(module, GatewayDispatchEvents.InteractionCreate);
    }

    /**
     * Handles the interaction triggered by the 'Post Profile' button.
     *
     * @param interaction The interaction that triggered the button.
     */
    async execute(interaction: AnyInteraction): Promise<void> {
        const isValidInteraction = interaction.isInvokedInGuild()
            && interaction.isMessageComponent()
            && interaction.data.isButton()
            && interaction.data.customID === ManageProfileButton.Post;

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

        const profile = await this.module.profiles.getWithMessages(interaction.guildID, interaction.user.id);
        if (profile === null) {
            return interaction.createMessage({
                components: [{
                    components: [{
                        custom_id: ManageProfileButton.Create,
                        label: "Create Profile",
                        style: ButtonStyle.Success,
                        type: ComponentType.Button
                    }],
                    type: ComponentType.ActionRow
                }],
                content: "You don't have a profile yet. Would you like to create one?",
                flags: MessageFlags.Ephemeral
            });
        }

        if (profile.creationStatus !== null) {
            return interaction.createMessage({
                components: [{
                    components: [{
                        custom_id: ManageProfileButton.Create,
                        label: "Finish Profile",
                        style: ButtonStyle.Success,
                        type: ComponentType.Button
                    }],
                    type: ComponentType.ActionRow
                }],
                content: "You haven't finished your profile yet. Would you like to continue?",
                flags: MessageFlags.Ephemeral
            });
        }

        const message = profile.messages.at(-1);
        if (message !== undefined) {
            const expiresAt = getCreatedAt(message.messageID) + COOLDOWN;
            if (expiresAt > Date.now()) {
                return interaction.createMessage({
                    content: `${config.emotes.error} You can post again <t:${Math.trunc(expiresAt / 1000)}:R>.`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        await this.module.postProfile(interaction.user, profile, settings);
        await interaction.createMessage({
            content: `${config.emotes.check} Successfully posted your profile!`,
            flags: MessageFlags.Ephemeral
        });
    }
}
