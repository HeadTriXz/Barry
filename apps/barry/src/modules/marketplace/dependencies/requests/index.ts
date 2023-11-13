import {
    type APIEmbed,
    type APIInteractionResponseCallbackData,
    type APIUser,
    ButtonStyle,
    ComponentType
} from "@discordjs/core";
import {
    type RequestWithAttachments,
    RequestMessageRepository,
    RequestRepository,
    RequestsSettingsRepository
} from "./database/index.js";
import type { Application } from "../../../../Application.js";
import type { ModuleWithSettings } from "../../../../types/modules.js";
import type { RequestsSettings } from "@prisma/client";

import {
    BooleanGuildSettingOption,
    ChannelGuildSettingOption,
    FloatGuildSettingOption
} from "../../../../config/options/index.js";
import { ConfigurableModule } from "../../../../config/module.js";
import { DiscordAPIError } from "@discordjs/rest";
import { getDWCEmbed } from "../../utils.js";
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
export default class RequestsModule extends ConfigurableModule<RequestsModule> implements ModuleWithSettings<
    RequestsSettings
> {
    /**
     * Repository class for managing request messages.
    */
    requestMessages: RequestMessageRepository;

    /**
     * Repository class for managing requests.
     */
    requests: RequestRepository;

    /**
     * Repository class for managing settings for this module.
     */
    settings: RequestsSettingsRepository;

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
        this.settings = new RequestsSettingsRepository(client.prisma);

        this.defineConfig({
            settings: {
                channelID: new ChannelGuildSettingOption({
                    description: "The channel where requests are posted.",
                    name: "Requests Channel",
                    nullable: true,
                    onEdit: async (self, interaction) => {
                        await self.handle(interaction);

                        const channelID = await self.get(interaction.guildID);
                        if (channelID !== null) {
                            await this.postButtons(channelID);
                        }
                    }
                }),
                enabled: new BooleanGuildSettingOption({
                    description: "Whether this module is enabled.",
                    name: "Enabled"
                }),
                minCompensation: new FloatGuildSettingOption({
                    description: "The minimum compensation for a request.",
                    minimum: 0,
                    name: "Minimum Compensation"
                })
            }
        });
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
        return this.#resetRequests(guildID, channelID, user, 14, [getDWCEmbed(reason)]);
    }

    /**
     * Returns the content of a request.
     *
     * @param requestID The ID of the request.
     * @returns The content of the request.
     */
    async getContent(requestID: number): Promise<APIInteractionResponseCallbackData | undefined> {
        const request = await this.requests.get(requestID);
        if (request === null) {
            return;
        }

        const user = await this.client.api.users.get(request.userID);
        return getRequestContent(user, request);
    }

    /**
     * Checks if the guild has enabled this module.
     *
     * @returns Whether the guild has enabled this module.
     */
    async isEnabled(guildID: string): Promise<boolean> {
        const settings = await this.settings.getOrCreate(guildID);
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
     * Posts the buttons for managing requests.
     *
     * @param channelID The ID of the channel.
     * @returns The ID of the message.
     */
    async postButtons(channelID: string): Promise<string> {
        const message = await this.client.api.channels.createMessage(channelID, {
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

        return message.id;
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
        const buttonsID = await this.postButtons(settings.channelID);

        await this.requestMessages.create(message.id, settings.guildID, request.id);
        await this.settings.upsert(settings.guildID, {
            lastMessageID: buttonsID
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
     * Removes the flag from all requests for the specified user.
     *
     * @param guildID The ID of the guild.
     * @param channelID The ID of the channel.
     * @param user The user to remove the flag of.
     */
    async unflagUser(guildID: string, channelID: string, user: APIUser): Promise<void> {
        return this.#resetRequests(guildID, channelID, user, 21);
    }

    /**
     * Resets flagged requests for a user in a specific guild's channel.
     *
     * @param guildID The ID of the guild.
     * @param channelID The ID of the channel.
     * @param user The user for whom the requests are being reset.
     * @param maxDays The maximum number of days ago a request can be to be reset.
     * @param embeds Optional array of embed objects to include in the updated messages.
     */
    async #resetRequests(
        guildID: string,
        channelID: string,
        user: APIUser,
        maxDays: number = 14,
        embeds: APIEmbed[] = []
    ): Promise<void> {
        const requests = await this.requests.getFlaggableByUser(guildID, user.id, maxDays);
        for (const request of requests) {
            const content = getRequestContent(user, request);
            if (embeds.length > 0) {
                content.embeds?.push(...embeds);
            }

            for (const message of request.messages) {
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
