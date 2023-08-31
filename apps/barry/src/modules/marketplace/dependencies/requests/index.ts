import { type APIUser, ButtonStyle, ComponentType } from "@discordjs/core";
import {
    type RequestWithAttachments,
    RequestMessageRepository,
    RequestRepository,
    RequestsSettingsRepository
} from "./database.js";
import type { Application } from "../../../../Application.js";
import type { RequestsSettings } from "@prisma/client";

import { Module } from "@barry/core";
import { getRequestContent } from "./editor/functions/content.js";
import { loadEvents } from "../../../../utils/loadFolder.js";

/**
 * Represents buttons for managing requests.
 */
export enum ManageRequestButton {
    Create = "create_request",
    Edit = "edit_request",
    Post = "post_request"
}

/**
 * Represents buttons for request actions.
 */
export enum RequestActionButton {
    Contact = "contact_request",
    Report = "report_request"
}

/**
 * Represents the requests module.
 */
export default class RequestsModule extends Module<Application> {
    requestMessages: RequestMessageRepository;
    requests: RequestRepository;
    requestsSettings: RequestsSettingsRepository;

    /**
     * Represents the requests module.
     *
     * @param client The client that initialized the module.
     */
    constructor(client: Application) {
        super(client, {
            id: "requests",
            name: "Requests",
            description: "Allows users to request services from creatives.",
            events: loadEvents("./events")
        });

        this.requestMessages = new RequestMessageRepository(client.prisma);
        this.requests = new RequestRepository(client.prisma);
        this.requestsSettings = new RequestsSettingsRepository(client.prisma);
    }

    /**
     * Checks if the guild has enabled this module.
     *
     * @returns Whether the guild has enabled this module.
     */
    async isEnabled(guildID: string): Promise<boolean> {
        const settings = await this.requestsSettings.getOrCreate(guildID);
        return settings.enabled;
    }

    /**
     * Checks if the provided compensation is valid.
     *
     * @param value The compensation to check.
     * @param minimum The minimum compensation.
     * @returns Whether the compensation is valid.
     */
    isValidCompensation(value: string, minimum: number): boolean {
        const numbers = value.match(/\d+/g);
        if (numbers === null) {
            return false;
        }

        return numbers.every((n) => Number(n) >= minimum);
    }

    /**
     * Posts the request in the marketplace.
     *
     * @param user The user that posted the request.
     * @param request The request to post.
     * @param settings The settings of this module.
     */
    async postRequest(
        user: APIUser,
        request: RequestWithAttachments,
        settings: RequestsSettings
    ): Promise<void> {
        if (settings.channelID === null) {
            throw new Error("Failed to post a request, channel is unknown.");
        }

        const content = getRequestContent(user, request);
        content.components = [{
            components: [
                {
                    custom_id: RequestActionButton.Contact,
                    label: "Contact",
                    style: ButtonStyle.Success,
                    type: ComponentType.Button
                },
                {
                    custom_id: RequestActionButton.Report,
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
                        custom_id: ManageRequestButton.Post,
                        label: "Post Request",
                        style: ButtonStyle.Success,
                        type: ComponentType.Button
                    },
                    {
                        custom_id: ManageRequestButton.Edit,
                        label: "Edit Request",
                        style: ButtonStyle.Secondary,
                        type: ComponentType.Button
                    }
                ],
                type: ComponentType.ActionRow
            }]
        });

        await this.requestMessages.create(message.id, settings.guildID, request.id);
        await this.requestsSettings.upsert(settings.guildID, {
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
