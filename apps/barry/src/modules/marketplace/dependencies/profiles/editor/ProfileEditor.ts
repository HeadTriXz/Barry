import { type Profile, ProfileCreationStatus } from "@prisma/client";
import type { UpdatableInteraction } from "@barry/core";
import type ProfilesModule from "../index.js";

import { ButtonStyle, ComponentType, MessageFlags } from "@discordjs/core";
import {
    getEditAvailabilityContent,
    getEditContactContent,
    getEditProfileContent,
    getProfileContent,
    retryComponents,
    timeoutContent
} from "./content.js";
import {
    INVITE_REGEX,
    capitalizeEachSentence,
    parseProfileData
} from "./functions/utils.js";
import config from "../../../../../config.js";

/**
 * Represents a class for editing and creating profiles.
 */
export class ProfileEditor {
    /**
     * Represents a class for editing and creating profiles.
     *
     * @param module The profiles module.
     * @param isEditing Whether the profile is being edited.
     * @param profile The profile to edit.
     */
    constructor(
        public module: ProfilesModule,
        public isEditing: boolean = true,
        public profile?: Profile
    ) {}

    /**
     * Edits the availability of the user's profile.
     *
     * @param interaction The interaction that triggered the availability editor.
     */
    async editAvailability(interaction: UpdatableInteraction): Promise<void> {
        const content = getEditAvailabilityContent(this.profile);
        await interaction.editParent(content);

        const response = await interaction.awaitMessageComponent({
            customIDs: ["create_profile_2"]
        });

        if (!response?.data.isStringSelect()) {
            return interaction.editParent(timeoutContent);
        }

        let bitflags = 0;
        for (const value of response.data.values) {
            bitflags |= Number(value);
        }

        this.profile = await this.module.profiles.upsert(interaction.user.id, {
            availability: bitflags,
            creationStatus: this.isEditing
                ? null
                : ProfileCreationStatus.Contact
        });

        await this.next(response);
    }

    /**
     * Edits the banner of the user's profile.
     *
     * @param interaction The interaction that triggered the banner editor.
     */
    async editBanner(
        interaction: UpdatableInteraction,
        channelID: string,
        initial: boolean = false
    ): Promise<void> {
        try {
            await this.module.client.api.channels.createMessage(channelID, {
                content: `### ${config.emotes.add} Post your banner below`
            });

            if (initial) {
                await interaction.editParent({
                    components: [],
                    content: `${config.emotes.check} I've sent you a direct message.`
                });
            }
        } catch {
            await interaction.editParent({
                components: retryComponents,
                content: `${config.emotes.error} I'm unable to send you a direct message. Please make sure you have your DMs enabled.`
            });

            const retryResponse = await interaction.awaitMessageComponent({
                customIDs: ["retry", "continue"]
            });

            if (retryResponse === undefined) {
                return interaction.editParent(timeoutContent);
            }

            await retryResponse.deferUpdate();
            if (retryResponse.data.customID === "retry") {
                return this.editBanner(retryResponse, channelID);
            }

            if (retryResponse.data.customID === "continue") {
                if (!this.isEditing) {
                    await this.module.profiles.upsert(interaction.user.id, {
                        creationStatus: ProfileCreationStatus.Preview
                    });
                }

                return this.showPreview(retryResponse, channelID);
            }
        }

        const message = await this.module.client.awaitMessage(channelID, interaction.user.id);
        if (message === undefined) {
            await this.module.client.api.channels.createMessage(channelID, timeoutContent);
            return;
        }

        const attachments = message.attachments.filter((a) => a.content_type?.startsWith("image"));
        if (attachments.length === 0) {
            const message = await this.module.client.api.channels.createMessage(channelID, {
                components: retryComponents,
                content: `${config.emotes.error} There are no images in that message.`
            });

            const retryResponse = await interaction.awaitMessageComponent({
                customIDs: ["retry", "continue"],
                messageID: message.id
            });

            if (retryResponse === undefined) {
                await this.module.client.api.channels.createMessage(channelID, timeoutContent);
                return;
            }

            await retryResponse.deferUpdate();
            if (retryResponse.data.customID === "retry") {
                return this.editBanner(retryResponse, channelID);
            }

            if (retryResponse.data.customID === "continue") {
                if (!this.isEditing) {
                    await this.module.profiles.upsert(interaction.user.id, {
                        creationStatus: ProfileCreationStatus.Preview
                    });
                }

                return this.showPreview(retryResponse, channelID);
            }
        }

        this.profile = await this.module.profiles.upsert(interaction.user.id, {
            bannerURL: attachments[0].url,
            creationStatus: this.isEditing
                ? null
                : ProfileCreationStatus.Preview
        });

        await this.showPreview(interaction, channelID);
    }

    /**
     * Edits the contact information of the user's profile.
     *
     * @param interaction The interaction that triggered the contact information editor.
     */
    async editContact(interaction: UpdatableInteraction): Promise<void> {
        const content = getEditContactContent(this.profile);
        await interaction.createModal(content);

        const response = await interaction.awaitModalSubmit(content.custom_id);
        if (response === undefined) {
            return interaction.editParent(timeoutContent);
        }

        if (INVITE_REGEX.test(response.values.contact)) {
            return response.createMessage({
                content: `${config.emotes.error} Your profile may not contain invite links.`,
                flags: MessageFlags.Ephemeral
            });
        }

        this.profile = await this.module.profiles.upsert(interaction.user.id, {
            contact: response.values.contact.length === 0
                ? null
                : capitalizeEachSentence(response.values.contact),
            creationStatus: this.isEditing
                ? null
                : ProfileCreationStatus.Banner
        });

        await this.next(response);
    }

    /**
     * Edits the information of the user's profile.
     *
     * @param interaction The interaction that triggered the profile editor.
     */
    async editProfile(interaction: UpdatableInteraction): Promise<void> {
        const content = getEditProfileContent(this.profile);
        await interaction.createModal(content);

        const response = await interaction.awaitModalSubmit(content.custom_id);
        if (response === undefined) {
            return interaction.editParent(timeoutContent);
        }

        const data = await parseProfileData(response);
        if (data !== undefined) {
            if (!this.isEditing) {
                data.creationStatus = ProfileCreationStatus.Availability;
            }

            this.profile = await this.module.profiles.upsert(interaction.user.id, data);

            await this.next(response);
        }
    }

    /**
     * Moves to the next step in profile editing.
     *
     * @param interaction The interaction that triggered the next step.
     */
    async next(interaction: UpdatableInteraction): Promise<void> {
        if (this.isEditing) {
            await interaction.deferUpdate();
            return this.showPreview(interaction);
        }

        if (this.profile !== undefined) {
            switch (this.profile.creationStatus) {
                case ProfileCreationStatus.Profile: {
                    return this.editProfile(interaction);
                }
                case ProfileCreationStatus.Availability: {
                    return this.editAvailability(interaction);
                }
                case ProfileCreationStatus.Contact: {
                    return this.editContact(interaction);
                }
                case ProfileCreationStatus.Banner: {
                    return this.promptBanner(interaction);
                }
                case ProfileCreationStatus.Preview: {
                    await interaction.deferUpdate();
                    return this.showPreview(interaction);
                }
            }
        }

        return this.editProfile(interaction);
    }

    /**
     * Prompts the user to add a banner to their profile.
     *
     * @param interaction The interaction that triggered the banner editor.
     */
    async promptBanner(interaction: UpdatableInteraction): Promise<void> {
        await interaction.editParent({
            components: [{
                components: [
                    {
                        custom_id: "yes",
                        label: "Yes",
                        style: ButtonStyle.Success,
                        type: ComponentType.Button
                    },
                    {
                        custom_id: "no",
                        label: "No",
                        style: ButtonStyle.Danger,
                        type: ComponentType.Button
                    }
                ],
                type: ComponentType.ActionRow
            }],
            content: `### ${config.emotes.add} Would you like to add a banner?`,
            flags: MessageFlags.Ephemeral
        });

        const response = await interaction.awaitMessageComponent({
            customIDs: ["yes", "no"]
        });

        if (response === undefined) {
            return interaction.editParent(timeoutContent);
        }

        await response.deferUpdate();

        if (response.data.customID === "yes") {
            const channel = await this.module.client.api.users.createDM(interaction.user.id);
            return this.editBanner(response, channel.id, true);
        }

        if (response.data.customID === "no") {
            await this.module.profiles.upsert(interaction.user.id, {
                creationStatus: ProfileCreationStatus.Preview
            });

            return this.showPreview(response);
        }
    }

    /**
     * Displays a preview of the user's profile.
     *
     * @param interaction The interaction that triggered the preview.
     * @param channelID The ID of the DM channel, if triggered in DMs.
     */
    async showPreview(interaction: UpdatableInteraction, channelID?: string): Promise<void> {
        if (this.profile === undefined) {
            const profile = await this.module.profiles.get(interaction.user.id);
            if (profile === null) {
                return interaction.createMessage({
                    content: `${config.emotes.error} I don't have access to that profile.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            this.profile = profile;
        }

        const content = getProfileContent(interaction.user, this.profile);
        content.components = [{
            components: [
                {
                    custom_id: "publish",
                    label: "Publish Profile",
                    style: ButtonStyle.Success,
                    type: ComponentType.Button
                },
                {
                    custom_id: "edit",
                    label: "Edit Profile",
                    style: ButtonStyle.Secondary,
                    type: ComponentType.Button
                },
                {
                    custom_id: "contact",
                    label: "Preview Contact",
                    style: ButtonStyle.Secondary,
                    type: ComponentType.Button
                }
            ],
            type: ComponentType.ActionRow
        }];

        content.content = "### Here's a preview of your profile:\n"
            + "Choose one of the following options:\n"
            + "- To make changes and edit your profile, press the **Edit Profile** button.\n"
            + "- To publish your profile, press the **Publish Profile** button.";

        const message = channelID !== undefined
            ? await this.module.client.api.channels.createMessage(channelID, content)
            : await interaction.editOriginalMessage(content);

        await this.#awaitPreviewResponse(interaction, message.id, channelID);
    }

    /**
     * Waits for interactions on a preview.
     *
     * @param interaction The interaction that triggered the preview.
     * @param messageID The ID of the message to listen on.
     * @param channelID The ID of the DM channel, if triggered in DMs.
     */
    async #awaitPreviewResponse(
        interaction: UpdatableInteraction,
        messageID: string,
        channelID?: string
    ): Promise<void> {
        const response = await interaction.awaitMessageComponent({
            customIDs: ["publish", "edit", "contact"],
            messageID: messageID
        });

        if (response === undefined) {
            return interaction.editParent(timeoutContent);
        }

        if (response.data.customID === "publish") {
            if (!interaction.isInvokedInGuild()) {
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

            if (!this.isEditing) {
                this.profile = await this.module.profiles.upsert(interaction.user.id, {
                    creationStatus: null
                });

                await this.module.postProfile(interaction.user, this.profile, settings);
            } else {
                const message = await this.module.profileMessages.getLatest(interaction.guildID, interaction.user.id);
                if (message !== null) {
                    const content = getProfileContent(interaction.user, this.profile!);
                    try {
                        await this.module.client.api.channels.editMessage(
                            settings.channelID,
                            message.messageID,
                            content
                        );
                    } catch {
                        this.module.client.logger.warn(`Could not edit last message (${message.messageID}) in the channel ${settings.channelID} of guild ${settings.guildID}`);
                    }
                } else {
                    await this.module.postProfile(interaction.user, this.profile!, settings);
                }
            }

            await response.editParent({
                components: [],
                content: `${config.emotes.check} Your profile has successfully been published!`,
                embeds: []
            });
        }

        if (response.data.customID === "edit") {
            this.isEditing = true;

            await response.editParent({
                components: [{
                    components: [{
                        custom_id: "preview_profile_edit",
                        options: ["Availability", "Banner", "Contact", "Profile"].map((o) => ({
                            label: o,
                            value: o.toLowerCase()
                        })),
                        type: ComponentType.StringSelect
                    }],
                    type: ComponentType.ActionRow
                }],
                content: `### ${config.emotes.add} What would you like to edit?`,
                embeds: []
            });

            const editResponse = await response.awaitMessageComponent({
                customIDs: ["preview_profile_edit"]
            });

            if (!editResponse?.data.isStringSelect()) {
                return response.editParent(timeoutContent);
            }

            switch (editResponse.data.values[0]) {
                case "availability": {
                    return this.editAvailability(editResponse);
                }
                case "banner": {
                    await editResponse.deferUpdate();
                    const channel = channelID !== undefined
                        ? { id: channelID }
                        : await this.module.client.api.users.createDM(interaction.user.id);

                    return this.editBanner(editResponse, channel.id, true);
                }
                case "contact": {
                    return this.editContact(editResponse);
                }
                case "profile": {
                    return this.editProfile(editResponse);
                }
            }
        }

        if (response.data.customID === "contact") {
            await response.deferUpdate();

            await this.module.displayContact(interaction, this.profile!);
            await this.#awaitPreviewResponse(interaction, messageID, channelID);
        }
    }
}
