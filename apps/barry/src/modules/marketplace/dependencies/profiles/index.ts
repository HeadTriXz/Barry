import {
    type APIEmbed,
    type APIUser,
    ButtonStyle,
    ComponentType
} from "@discordjs/core";
import type { Profile, ProfilesSettings } from "@prisma/client";
import type { Application } from "../../../../Application.js";

import {
    ProfileMessageRepository,
    ProfileRepository,
    ProfilesSettingsRepository
} from "./database.js";

import { DiscordAPIError } from "@discordjs/rest";
import { Module } from "@barry/core";
import { getDWCEmbed } from "../../utils.js";
import { getProfileContent } from "./editor/functions/content.js";
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
     * Flags all requests for the specified user.
     *
     * @param guildID The ID of the guild.
     * @param channelID The ID of the channel.
     * @param user The user to flag the requests of.
     * @param reason The reason to flag the user.
     */
    async flagUser(guildID: string, channelID: string, user: APIUser, reason: string): Promise<void> {
        return this.#resetProfiles(guildID, channelID, user, 14, [getDWCEmbed(reason)]);
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

    /**
     * Removes the flag from all profiles for the specified user.
     *
     * @param guildID The ID of the guild.
     * @param channelID The ID of the channel.
     * @param user The user to remove the flag of.
     */
    async unflagUser(guildID: string, channelID: string, user: APIUser): Promise<void> {
        return this.#resetProfiles(guildID, channelID, user, 21);
    }

    /**
     * Resets flagged profiles for a user in a specific guild's channel.
     *
     * @param guildID The ID of the guild.
     * @param channelID The ID of the channel.
     * @param user The user for whom the profiles are being reset.
     * @param maxDays The maximum number of days ago a request can be to be reset.
     * @param embeds Optional array of embed objects to include in the updated messages.
     */
    async #resetProfiles(
        guildID: string,
        channelID: string,
        user: APIUser,
        maxDays: number = 14,
        embeds: APIEmbed[] = []
    ): Promise<void> {
        const profile = await this.profiles.getWithFlaggableMessages(guildID, user.id, maxDays);
        if (profile !== null) {
            const content = getProfileContent(user, profile);
            if (embeds.length > 0) {
                content.embeds?.push(...embeds);
            }

            for (const message of profile.messages) {
                try {
                    await this.client.api.channels.editMessage(channelID, message.messageID, content);
                } catch (error: unknown) {
                    if (error instanceof DiscordAPIError && error.code === 10008) {
                        continue;
                    }

                    this.client.logger.error(error);
                }
            }
        }
    }
}
