import {
    type APIUser,
    ButtonStyle,
    ComponentType,
    MessageFlags
} from "@discordjs/core";
import type { Profile, ProfilesSettings } from "@prisma/client";
import { type ReplyableInteraction, Module } from "@barry/core";
import type { Application } from "../../../../Application.js";

import { ProfileMessageRepository, ProfileRepository, ProfilesSettingsRepository } from "./database.js";
import { getProfileContent } from "./editor/content.js";
import { loadEvents } from "../../../../utils/loadFolder.js";

/**
 * Represents buttons for managing profiles.
 */
export enum ManageProfileButton {
    Create = "create_profile",
    Edit = "edit_profile",
    Post = "post_profile"
}

/**
 * Represents buttons for profile actions.
 */
export enum ProfileActionButton {
    Contact = "contact_profile",
    Report = "report_profile"
}

/**
 * Represents the profile module.
 */
export default class ProfilesModule extends Module<Application> {
    /**
     * Repository class for managing profile messages.
     */
    profileMessages: ProfileMessageRepository;

    /**
     * Repository class for managing profiles.
     */
    profiles: ProfileRepository;

    /**
     * Repository class for managing settings for this module.
     */
    profilesSettings: ProfilesSettingsRepository;

    /**
     * Represents the profile module.
     *
     * @param client The client that initialized the module.
     */
    constructor(client: Application) {
        super(client, {
            id: "profiles",
            name: "Profiles",
            description: "Allows creatives to showcase their skills and services.",
            events: loadEvents("./events")
        });

        this.profileMessages = new ProfileMessageRepository(client.prisma);
        this.profiles = new ProfileRepository(client.prisma);
        this.profilesSettings = new ProfilesSettingsRepository(client.prisma);
    }

    /**
     * Displays the contact information of a profile.
     *
     * @param interaction The interaction to reply to.
     * @param profile The profile to display the contact information of.
     */
    async displayContact(interaction: ReplyableInteraction, profile: Profile): Promise<void> {
        if (profile.contact === null) {
            return interaction.createMessage({
                components: [{
                    components: [{
                        label: "Send a DM",
                        style: ButtonStyle.Link,
                        type: ComponentType.Button,
                        url: `https://discord.com/users/${profile.userID}`
                    }],
                    type: ComponentType.ActionRow
                }],
                content: `<@${profile.userID}> hasn't provided any contact information. You can reach out to them by sending a direct message.`,
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.createMessage({
            components: [{
                components: [{
                    label: "Send a DM",
                    style: ButtonStyle.Link,
                    type: ComponentType.Button,
                    url: `https://discord.com/users/${profile.userID}`
                }],
                type: ComponentType.ActionRow
            }],
            content: `<@${profile.userID}> prefers to be contacted using the following information:\n\`\`\`\n${profile.contact}\`\`\``,
            flags: MessageFlags.Ephemeral
        });
    }

    /**
     * Checks if the guild has enabled this module.
     *
     * @returns Whether the guild has enabled this module.
     */
    async isEnabled(guildID: string): Promise<boolean> {
        const settings = await this.profilesSettings.getOrCreate(guildID);
        return settings.enabled;
    }

    /**
     * Posts the profile of a user in the marketplace.
     *
     * @param user The user to post the profile of.
     * @param profile The profile of the user.
     * @param settings The settings of this module.
     */
    async postProfile(
        user: APIUser,
        profile: Profile,
        settings: ProfilesSettings
    ): Promise<void> {
        if (settings.channelID === null) {
            throw new Error("Failed to post a profile, channel is unknown.");
        }

        const content = getProfileContent(user, profile);
        content.components = [{
            components: [
                {
                    custom_id: ProfileActionButton.Contact,
                    label: "Contact",
                    style: ButtonStyle.Success,
                    type: ComponentType.Button
                },
                {
                    custom_id: ProfileActionButton.Report,
                    label: "Report",
                    style: ButtonStyle.Secondary,
                    type: ComponentType.Button
                }
            ],
            type: ComponentType.ActionRow
        }];

        const message = await this.client.api.channels.createMessage(settings.channelID, content);
        const buttons = await this.client.api.channels.createMessage(settings.channelID, {
            components: [{
                components: [
                    {
                        custom_id: ManageProfileButton.Post,
                        label: "Post Profile",
                        style: ButtonStyle.Success,
                        type: ComponentType.Button
                    },
                    {
                        custom_id: ManageProfileButton.Edit,
                        label: "Edit Profile",
                        style: ButtonStyle.Secondary,
                        type: ComponentType.Button
                    }
                ],
                type: ComponentType.ActionRow
            }]
        });

        await this.profileMessages.create(message.id, settings.guildID, user.id);
        await this.profilesSettings.upsert(settings.guildID, {
            lastMessageID: buttons.id
        });

        if (settings.lastMessageID !== null) {
            try {
                await this.client.api.channels.deleteMessage(settings.channelID, settings.lastMessageID);
            } catch {
                this.client.logger.warn(`Could not delete last message (${settings.lastMessageID}) in the channel ${settings.channelID} of guild ${settings.guildID}`);
            }
        }
    }
}
