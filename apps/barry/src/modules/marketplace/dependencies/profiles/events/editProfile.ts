import { type AnyInteraction, Event } from "@barry/core";
import type ProfilesModule from "../index.js";

import {
    ButtonStyle,
    ComponentType,
    GatewayDispatchEvents,
    MessageFlags
} from "@discordjs/core";
import { ProfileEditor } from "../editor/ProfileEditor.js";
import { ManageProfileButton } from "../index.js";
import { timeoutContent } from "../editor/content.js";

import config from "../../../../../config.js";

/**
 * Represents an event handler for editing a profile.
 */
export default class extends Event<ProfilesModule> {
    /**
     * Represents an event handler for editing a profile.
     *
     * @param module The module the event belongs to.
     */
    constructor(module: ProfilesModule) {
        super(module, GatewayDispatchEvents.InteractionCreate);
    }

    /**
     * Handles the interaction triggered by the 'Edit Profile' button.
     *
     * @param interaction The interaction that triggered the button.
     */
    async execute(interaction: AnyInteraction): Promise<void> {
        const isValidInteraction = interaction.isInvokedInGuild()
            && interaction.isMessageComponent()
            && interaction.data.isButton()
            && interaction.data.customID === ManageProfileButton.Edit;

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

        const profile = await this.module.profiles.get(interaction.user.id);
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

        await interaction.createMessage({
            components: [{
                components: [{
                    custom_id: "edit_profile_select",
                    options: ["Availability", "Banner", "Contact", "Profile"].map((o) => ({
                        label: o,
                        value: o.toLowerCase()
                    })),
                    type: ComponentType.StringSelect
                }],
                type: ComponentType.ActionRow
            }],
            content: `### ${config.emotes.add} What would you like to edit?`,
            flags: MessageFlags.Ephemeral
        });

        const response = await interaction.awaitMessageComponent({
            customIDs: ["edit_profile_select"]
        });

        if (!response?.data.isStringSelect()) {
            return interaction.editParent(timeoutContent);
        }

        const editor = new ProfileEditor(this.module, true, profile);
        switch (response.data.values[0]) {
            case "availability": {
                return editor.editAvailability(response);
            }
            case "banner": {
                await response.deferUpdate();
                const channel = await this.client.api.users.createDM(interaction.user.id);

                return editor.editBanner(response, channel.id, true);
            }
            case "contact": {
                return editor.editContact(response);
            }
            case "profile": {
                return editor.editProfile(response);
            }
        }
    }
}
