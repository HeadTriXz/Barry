import { type RequestsSettings, RequestStatus } from "@prisma/client";
import type { RequestWithAttachments } from "../database/index.js";
import type { UpdatableInteraction } from "@barry-bot/core";
import type RequestsModule from "../index.js";

import { ButtonStyle, ComponentType, MessageFlags } from "@discordjs/core";
import { INVITE_REGEX, retryComponents } from "../../../constants.js";
import { capitalizeEachSentence, capitalizeEachWord, displayContact } from "../../../utils.js";
import { getEditContactContent, getEditRequestContent, getRequestContent } from "./functions/content.js";
import { timeoutContent } from "../../../../../common.js";
import config from "../../../../../config.js";

/**
 * Represents a class for editing and creating requests.
 */
export class RequestEditor {
    /**
     * Represents a class for editing and creating requests.
     *
     * @param module The requests module.
     * @param settings The settings of the requests module.
     * @param isEditing Whether the request is being edited.
     * @param request The request to edit.
     */
    constructor(
        public module: RequestsModule,
        public settings: RequestsSettings,
        public isEditing: boolean = true,
        public request?: RequestWithAttachments
    ) {}

    /**
     * Edits the attachments of the request.
     *
     * @param interaction The interaction that triggered the attachment editor.
     * @param channelID The ID of the channel to watch for attachments in.
     * @param initial Whether this is the initial attachment prompt.
     */
    async editAttachments(
        interaction: UpdatableInteraction,
        channelID: string,
        initial: boolean = false
    ): Promise<void> {
        try {
            await this.module.client.api.channels.createMessage(channelID, {
                content: `### ${config.emotes.add} Post your attachments below`
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
                return this.editAttachments(retryResponse, channelID);
            }

            if (retryResponse.data.customID === "continue") {
                if (!this.isEditing) {
                    this.request = await this.module.requests.upsert(interaction.user.id, {
                        status: RequestStatus.DraftPreview
                    }, this.request?.id);
                }

                return this.showPreview(retryResponse);
            }
        }

        const message = await this.module.client.awaitMessage(channelID, interaction.user.id);
        if (message === undefined) {
            await this.module.client.api.channels.createMessage(channelID, timeoutContent);
            return;
        }

        if (message.attachments.length === 0) {
            const buttons = [ ...retryComponents[0].components ];
            if (this.isEditing) {
                buttons.push({
                    custom_id: "clear",
                    label: "Remove All",
                    style: ButtonStyle.Danger,
                    type: ComponentType.Button
                });
            }

            const message = await this.module.client.api.channels.createMessage(channelID, {
                components: [{
                    components: buttons,
                    type: ComponentType.ActionRow
                }],
                content: `${config.emotes.error} There are no attachments in that message.`
            });

            const retryResponse = await interaction.awaitMessageComponent({
                customIDs: ["retry", "continue", "clear"],
                messageID: message.id
            });

            if (retryResponse === undefined) {
                await this.module.client.api.channels.editMessage(channelID, message.id, timeoutContent);
                return;
            }

            if (retryResponse.data.customID === "retry") {
                await retryResponse.deferUpdate();
                return this.editAttachments(retryResponse, channelID);
            }

            if (retryResponse.data.customID === "continue") {
                if (!this.isEditing) {
                    this.request = await this.module.requests.upsert(interaction.user.id, {
                        status: RequestStatus.DraftPreview
                    }, this.request?.id);
                }

                return this.showPreview(retryResponse, channelID);
            }
        }

        this.request = await this.module.requests.upsert(interaction.user.id, {
            attachments: {
                create: message.attachments.map((a) => ({
                    contentType: a.content_type || "text/plain",
                    name: a.filename,
                    url: a.url
                }))
            },
            status: this.isEditing
                ? undefined
                : RequestStatus.DraftPreview
        }, this.request?.id);

        return this.showPreview(interaction, channelID);
    }

    /**
     * Edits the contact information of the request.
     *
     * @param interaction The interaction that triggered the contact editor.
     */
    async editContact(interaction: UpdatableInteraction): Promise<void> {
        const content = getEditContactContent(this.request);
        await interaction.createModal(content);

        const response = await interaction.awaitModalSubmit(content.custom_id);
        if (response === undefined) {
            return interaction.editParent(timeoutContent);
        }

        if (INVITE_REGEX.test(response.values.contact)) {
            return response.editParent({
                content: `${config.emotes.error} Your request may not contain invite links.`,
                flags: MessageFlags.Ephemeral
            });
        }

        this.request = await this.module.requests.upsert(interaction.user.id, {
            contact: response.values.contact.length === 0
                ? null
                : capitalizeEachSentence(response.values.contact),
            status: this.isEditing
                ? undefined
                : RequestStatus.DraftAttachments
        }, this.request?.id);

        await this.next(response);
    }

    /**
     * Edits the information of the request.
     *
     * @param interaction The interaction that triggered the request editor.
     */
    async editRequest(interaction: UpdatableInteraction): Promise<void> {
        const content = getEditRequestContent(this.settings, this.request);
        await interaction.createModal(content);

        const response = await interaction.awaitModalSubmit(content.custom_id);
        if (response === undefined) {
            return interaction.editParent(timeoutContent);
        }

        const { compensation, deadline, description, location, title } = response.values;
        const containsInvite = INVITE_REGEX.test(compensation)
            || INVITE_REGEX.test(deadline)
            || INVITE_REGEX.test(description)
            || INVITE_REGEX.test(location)
            || INVITE_REGEX.test(title);

        if (containsInvite) {
            return response.editParent({
                content: `${config.emotes.error} Your request may not contain invite links.`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (!this.module.isValidCompensation(compensation, this.settings.minCompensation)) {
            return response.editParent({
                content: `${config.emotes.error} The compensation must be at least $${this.settings.minCompensation}.`,
                flags: MessageFlags.Ephemeral
            });
        }

        this.request = await this.module.requests.upsert(interaction.user.id, {
            compensation: capitalizeEachSentence(compensation),
            deadline: deadline.length === 0
                ? null
                : capitalizeEachSentence(deadline),
            description: capitalizeEachSentence(description),
            location: location.length === 0
                ? null
                : capitalizeEachWord(location),
            status: this.isEditing
                ? undefined
                : RequestStatus.DraftContact,
            title: capitalizeEachWord(title)
        }, this.request?.id);

        if (this.isEditing) {
            return this.next(response);
        }

        await response.editParent({
            components: [{
                components: [{
                    custom_id: "continue",
                    label: "Continue",
                    style: ButtonStyle.Secondary,
                    type: ComponentType.Button
                }],
                type: ComponentType.ActionRow
            }],
            content: `${config.emotes.check} Great! Let's add your preferred contact method.`
        });

        const continueResponse = await response.awaitMessageComponent({
            customIDs: ["continue"]
        });

        if (continueResponse === undefined) {
            return response.editParent(timeoutContent);
        }

        await this.next(continueResponse);
    }

    /**
     * Moves to the next step of the request editor.
     *
     * @param interaction The interaction that triggered the next step.
     */
    async next(interaction: UpdatableInteraction): Promise<void> {
        if (this.isEditing) {
            await interaction.deferUpdate();
            return this.showPreview(interaction);
        }

        if (this.request !== undefined) {
            switch (this.request.status) {
                case RequestStatus.DraftAttachments: {
                    return this.promptAttachments(interaction);
                }
                case RequestStatus.DraftContact: {
                    return this.editContact(interaction);
                }
                case RequestStatus.DraftPreview: {
                    await interaction.deferUpdate();
                    return this.showPreview(interaction);
                }
            }
        }

        return this.editRequest(interaction);
    }

    /**
     * Prompts the user to add attachments to their request.
     *
     * @param interaction The interaction that triggered the attachments editor.
     */
    async promptAttachments(interaction: UpdatableInteraction): Promise<void> {
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
            content: `### ${config.emotes.add} Would you like to add attachments?`,
            flags: MessageFlags.Ephemeral
        });

        const response = await interaction.awaitMessageComponent({
            customIDs: ["yes", "no"]
        });

        if (response === undefined) {
            return interaction.editParent(timeoutContent);
        }

        if (response.data.customID === "yes") {
            await response.deferUpdate();

            const channel = await this.module.client.api.users.createDM(interaction.user.id);
            return this.editAttachments(response, channel.id, true);
        }

        if (response.data.customID === "no") {
            if (!this.isEditing) {
                this.request = await this.module.requests.upsert(interaction.user.id, {
                    status: RequestStatus.DraftPreview
                }, this.request?.id);
            }

            return this.next(response);
        }
    }

    /**
     * Displays a preview of the request.
     *
     * @param interaction The interaction that triggered the preview.
     * @param channelID The ID of the DM channel, if triggered in DMs.
     */
    async showPreview(interaction: UpdatableInteraction, channelID?: string): Promise<void> {
        this.request ??= await this.module.requests.getDraft(interaction.user.id) || undefined;
        if (this.request === undefined) {
            return interaction.editParent({
                content: `${config.emotes.error} Failed to find the request you're looking for.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const content = getRequestContent(interaction.user, this.request);
        content.components = [{
            components: [
                {
                    custom_id: "publish",
                    label: "Publish Request",
                    style: ButtonStyle.Success,
                    type: ComponentType.Button
                },
                {
                    custom_id: "edit",
                    label: "Edit Request",
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

        content.content = "### Here's a preview of your request:\n"
            + "Choose one of the following options:\n"
            + "- To make changes and edit your request, press the **Edit Request** button.\n"
            + "- To publish your request, press the **Publish Request** button.";

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
            if (this.isEditing) {
                if (this.settings.channelID === null) {
                    return interaction.editParent({
                        content: `${config.emotes.error} This guild hasn't setup their channel for requests.`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                const message = await this.module.requestMessages.getLatest(this.settings.guildID, this.request!.id);
                if (message !== null) {
                    const content = getRequestContent(interaction.user, this.request!);
                    try {
                        await this.module.client.api.channels.editMessage(
                            this.settings.channelID,
                            message.messageID,
                            content
                        );
                    } catch {
                        this.module.client.logger.warn(`Could not edit last message (${message.messageID}) in the channel ${this.settings.channelID} of guild ${this.settings.guildID}`);
                    }
                } else {
                    await this.module.postRequest(interaction.user, this.request!, this.settings);
                }
            } else {
                this.request = await this.module.requests.upsert(interaction.user.id, {
                    status: RequestStatus.Available
                }, this.request?.id);

                await this.module.postRequest(interaction.user, this.request, this.settings);
            }

            await response.editParent({
                components: [],
                content: `${config.emotes.check} Your request has successfully been published!`,
                embeds: []
            });
        }

        if (response.data.customID === "edit") {
            this.isEditing = true;

            await response.editParent({
                components: [{
                    components: [{
                        custom_id: "preview_request_edit",
                        options: ["Attachments", "Contact", "Request"].map((o) => ({
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
                customIDs: ["preview_request_edit"]
            });

            if (!editResponse?.data.isStringSelect()) {
                return response.editParent(timeoutContent);
            }

            switch (editResponse.data.values[0]) {
                case "attachments": {
                    await editResponse.deferUpdate();
                    const channel = channelID !== undefined
                        ? { id: channelID }
                        : await this.module.client.api.users.createDM(interaction.user.id);

                    return this.editAttachments(editResponse, channel.id, true);
                }
                case "contact": {
                    return this.editContact(editResponse);
                }
                case "request": {
                    return this.editRequest(editResponse);
                }
            }
        }

        if (response.data.customID === "contact") {
            await response.deferUpdate();

            await displayContact(response, this.request!);
            await this.#awaitPreviewResponse(interaction, messageID, channelID);
        }
    }
}
