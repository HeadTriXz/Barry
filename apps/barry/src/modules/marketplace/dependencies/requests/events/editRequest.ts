import { type AnyInteraction, type UpdatableInteraction, Event } from "@barry-bot/core";
import type RequestsModule from "../index.js";

import {
    ButtonStyle,
    ComponentType,
    GatewayDispatchEvents,
    MessageFlags
} from "@discordjs/core";

import { RequestEditor } from "../editor/RequestEditor.js";
import { RequestStatus } from "@prisma/client";
import { ManageRequestButton } from "../index.js";
import { timeoutContent } from "../../../../../common.js";

import config, { type Emoji } from "../../../../../config.js";

/**
 * Represents emojis for each request status.
 */
const emojis: Partial<Record<RequestStatus, Emoji>> = {
    [RequestStatus.Available]: config.emotes.available,
    [RequestStatus.Taken]: config.emotes.busy,
    [RequestStatus.Finished]: config.emotes.unavailable
};

/**
 * Represents an event handler for editing a request.
 */
export default class extends Event<RequestsModule> {
    /**
     * Represents an event handler for editing a request.
     *
     * @param module The module the event belongs to.
     */
    constructor(module: RequestsModule) {
        super(module, GatewayDispatchEvents.InteractionCreate);
    }

    /**
     * Handles the interaction triggered by the 'Edit Request' button.
     *
     * @param interaction The interaction that triggered the button.
     */
    async execute(interaction: AnyInteraction): Promise<void> {
        const isValidInteraction = interaction.isInvokedInGuild()
            && interaction.isMessageComponent()
            && interaction.data.isButton()
            && interaction.data.customID === ManageRequestButton.Edit;

        if (!isValidInteraction) {
            return;
        }

        const settings = await this.module.settings.getOrCreate(interaction.guildID);
        if (!settings.enabled) {
            return interaction.createMessage({
                content: `${config.emotes.error} Requests are currently disabled for this guild.`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (settings.channelID === null) {
            return interaction.createMessage({
                content: `${config.emotes.error} This guild hasn't setup their channel for requests.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const requests = await this.module.requests.getEditableByUser(interaction.user.id);
        if (requests.length === 0) {
            return interaction.createMessage({
                components: [{
                    components: [{
                        custom_id: ManageRequestButton.Create,
                        label: "Create Request",
                        style: ButtonStyle.Success,
                        type: ComponentType.Button
                    }],
                    type: ComponentType.ActionRow
                }],
                content: "You don't have a request yet. Would you like to create one?",
                flags: MessageFlags.Ephemeral
            });
        }

        const formatter = new Intl.DateTimeFormat("en-US", {
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
            month: "long",
            year: "numeric"
        });

        await interaction.createMessage({
            components: [
                {
                    components: [{
                        custom_id: "edit_specific_request",
                        options: requests.map((request) => ({
                            description: `Last updated on ${formatter.format(request.updatedAt)}`,
                            emoji: {
                                id: emojis[request.status]?.id,
                                name: emojis[request.status]?.name
                            },
                            label: `[${request.id}] ${request.title}`,
                            value: request.id.toString()
                        })),
                        type: ComponentType.StringSelect
                    }],
                    type: ComponentType.ActionRow
                }
            ],
            content: `### ${config.emotes.add} Which request would you like to edit?`,
            flags: MessageFlags.Ephemeral
        });

        const response = await interaction.awaitMessageComponent({
            customIDs: ["edit_specific_request"]
        });

        if (!response?.data.isStringSelect()) {
            return interaction.editParent(timeoutContent);
        }

        const value = Number(response.data.values[0]);
        const request = requests.find((request) => request.id === value);
        if (request === undefined) {
            return response.editParent({
                content: `${config.emotes.error} Failed to find the request you're looking for.`
            });
        }

        await response.editParent({
            components: [{
                components: [{
                    custom_id: "edit_request_select",
                    options: ["Status", "Attachments", "Contact", "Request"].map((o) => ({
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
            customIDs: ["edit_request_select"]
        });

        if (!editResponse?.data.isStringSelect()) {
            return response.editParent(timeoutContent);
        }

        const editor = new RequestEditor(this.module, settings, true, request);
        switch (editResponse.data.values[0]) {
            case "attachments": {
                await editResponse.deferUpdate();
                const channel = await this.module.client.api.users.createDM(interaction.user.id);

                return editor.editAttachments(editResponse, channel.id, true);
            }
            case "contact": {
                return editor.editContact(editResponse);
            }
            case "request": {
                return editor.editRequest(editResponse);
            }
            case "status": {
                await this.#editStatus(editResponse, editor);
            }
        }
    }

    /**
     * Edits the status of the selected request.
     *
     * @param interaction The interaction that triggered the select menu.
     * @param editor The editor of the request.
     */
    async #editStatus(interaction: UpdatableInteraction, editor: RequestEditor): Promise<void> {
        if (editor.request === undefined) {
            return interaction.editParent({
                content: `${config.emotes.error} Failed to find the request you're looking for.`
            });
        }

        await interaction.editParent({
            components: [{
                components: [{
                    custom_id: "edit_request_status",
                    options: [
                        RequestStatus.Available,
                        RequestStatus.Taken,
                        RequestStatus.Finished
                    ].map((o) => ({
                        default: editor.request!.status === o,
                        emoji: {
                            id: emojis[o]?.id,
                            name: emojis[o]?.name
                        },
                        label: o,
                        value: o
                    })),
                    type: ComponentType.StringSelect
                }],
                type: ComponentType.ActionRow
            }],
            content: `### ${config.emotes.add} What's the new status?`
        });

        const response = await interaction.awaitMessageComponent({
            customIDs: ["edit_request_status"]
        });

        if (!response?.data.isStringSelect()) {
            return interaction.editParent(timeoutContent);
        }

        editor.request = await this.module.requests.upsert(interaction.user.id, {
            status: response.data.values[0] as RequestStatus
        }, editor.request.id);

        await editor.next(response);
    }
}
