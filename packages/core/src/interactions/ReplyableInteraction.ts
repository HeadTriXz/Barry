import type {
    AnyInteraction,
    MessageComponentInteraction,
    ModalSubmitInteraction
} from "./index.js";
import {
    type APIInteraction,
    type APIInteractionResponseCallbackData,
    type APIInteractionResponseDeferredChannelMessageWithSource,
    type APIMessage,
    type APIModalInteractionResponseCallbackData,
    InteractionResponseType,
    GatewayDispatchEvents
} from "@discordjs/core";

import type { Client } from "../Client.js";
import type { RawFile } from "@discordjs/rest";
import type { ResponseHandler } from "../Server.js";

import { Interaction } from "./Interaction.js";

/**
 * Represents options for interaction response data with files.
 */
interface APIInteractionResponseCallbackDataWithFiles extends APIInteractionResponseCallbackData {
    /**
     * Files to attach to the response.
     */
    files?: RawFile[];
}

/**
 * Represents options for awaiting a message component response.
 */
interface AwaitMessageComponentOptions {
    /**
     * An array of `custom_id`'s to match.
     */
    customIDs?: string[];

    /**
     * The ID of the message to match. Defaults to the initial response.
     */
    messageID?: string;

    /**
     * The timeout duration in milliseconds. Defaults to 15 minutes.
     */
    timeout?: number;

    /**
     * The ID of the user to match, or null to allow any user. Defaults to the interaction user.
     */
    userID?: string | null;
}

/**
 * Represents an interaction.
 */
export class ReplyableInteraction extends Interaction {
    /**
     * The client that received the interaction.
     */
    #client: Client;

    /**
     * The ID of the initial interaction response.
     */
    #originalMessageID?: string;

    /**
     * Represents an interaction.
     *
     * @param data The raw interaction object.
     * @param client The client that received the interaction.
     * @param respond The response handler to use for this interaction.
     */
    constructor(data: APIInteraction, client: Client, respond?: ResponseHandler) {
        super(data, client, respond);
        this.#client = client;
    }

    /**
     * Waits for a message component response.
     *
     * @param options The options for awaiting the message component response.
     * @returns The matching MessageComponentInteraction or undefined if timed out.
     */
    async awaitMessageComponent({
        customIDs = [],
        messageID = this.#originalMessageID,
        timeout = 15 * 60 * 1000,
        userID = this.user.id
    }: AwaitMessageComponentOptions = {}): Promise<MessageComponentInteraction | undefined> {
        if (messageID === undefined && !this.acknowledged) {
            throw new Error("You must send an initial response before listening for components.");
        }

        return new Promise((resolve) => {
            const cleanup = (interaction?: MessageComponentInteraction): void => {
                this.#client.off(GatewayDispatchEvents.InteractionCreate, listener);

                clearTimeout(timeoutID);
                resolve(interaction);
            };

            const listener = async (interaction: AnyInteraction): Promise<void> => {
                const isValidComponent = interaction.isMessageComponent()
                    && (customIDs.length === 0 || customIDs.includes(interaction.data.customID))
                    && (userID === null || interaction.user.id === userID);

                if (!isValidComponent) {
                    return;
                }

                if (messageID === undefined) {
                    const message = await this.getOriginalMessage();
                    messageID = message.id;
                }

                if (interaction.message.id === messageID) {
                    cleanup(interaction);
                }
            };

            const timeoutID = setTimeout(cleanup, timeout);
            this.#client.on(GatewayDispatchEvents.InteractionCreate, listener);
        });
    }

    /**
     * Waits for a modal submit response with the specified custom ID.
     *
     * @param customID The custom ID to match.
     * @param timeout The timeout duration in milliseconds (default: 15 minutes).
     * @returns The matching ModalSubmitInteraction or undefined if timed out.
     */
    async awaitModalSubmit(
        customID: string,
        timeout: number = 15 * 60 * 1000
    ): Promise<ModalSubmitInteraction | undefined> {
        return new Promise((resolve) => {
            const cleanup = (interaction?: ModalSubmitInteraction): void => {
                this.#client.off(GatewayDispatchEvents.InteractionCreate, listener);

                clearTimeout(timeoutID);
                resolve(interaction);
            };

            const listener = (interaction: AnyInteraction): void => {
                if (!interaction.isModalSubmit()) {
                    return;
                }

                if (interaction.data.customID === customID) {
                    cleanup(interaction);
                }
            };

            const timeoutID = setTimeout(cleanup, timeout);
            this.#client.on(GatewayDispatchEvents.InteractionCreate, listener);
        });
    }

    /**
     * Respond to the interaction with a followup message.
     *
     * @param options The options for the followup message.
     * @returns The followup message.
     */
    async createFollowupMessage(options: APIInteractionResponseCallbackDataWithFiles): Promise<APIMessage> {
        return this.#client.api.webhooks.execute(this.applicationID, this.token, { ...options, wait: true });
    }

    /**
     * Acknowledges the interaction with a message. If already acknowledged, runs createFollowupMessage.
     *
     * @param options The options for the message.
     */
    async createMessage({ files, ...options }: APIInteractionResponseCallbackDataWithFiles): Promise<void> {
        if (this.acknowledged) {
            await this.createFollowupMessage({ files, ...options });
            return;
        }

        await this.createResponse({
            body: {
                type: InteractionResponseType.ChannelMessageWithSource,
                data: options
            },
            files: files
        });

        this.acknowledged = true;
    }

    /**
     * Responds to an interaction with a modal.
     *
     * @param options The options for the modal.
     */
    async createModal(options: APIModalInteractionResponseCallbackData): Promise<void> {
        if (this.acknowledged) {
            throw new Error("You have already acknowledged this interaction.");
        }

        await this.createResponse({
            body: {
                type: InteractionResponseType.Modal,
                data: options
            }
        });

        this.acknowledged = true;
    }

    /**
     * Acknowledges the interaction with a defer response.
     *
     * @param options The options for the defer message.
     */
    async defer(options?: APIInteractionResponseDeferredChannelMessageWithSource["data"]): Promise<void> {
        if (this.acknowledged) {
            throw new Error("You have already acknowledged this interaction.");
        }

        await this.createResponse({
            body: {
                type: InteractionResponseType.DeferredChannelMessageWithSource,
                data: options
            }
        });

        this.acknowledged = true;
    }

    /**
     * Delete a followup message for the interaction.
     *
     * @param messageID The ID of the message.
     */
    async deleteFollowupMessage(messageID: string): Promise<void> {
        return this.#client.api.webhooks.deleteMessage(this.applicationID, this.token, messageID);
    }

    /**
     * Deletes the initial interaction response.
     */
    async deleteOriginalMessage(): Promise<void> {
        return this.deleteFollowupMessage("@original");
    }

    /**
     * Edit a followup message for the interaction.
     *
     * @param messageID The ID of the message.
     * @param options The options for the message.
     * @returns The modified message.
     */
    async editFollowupMessage(
        messageID: string,
        options: APIInteractionResponseCallbackDataWithFiles
    ): Promise<APIMessage> {
        return this.#client.api.webhooks.editMessage(this.applicationID, this.token, messageID, options);
    }

    /**
     * Edit the initial interaction response.
     *
     * @param options The options for the message.
     * @returns The modified message.
     */
    async editOriginalMessage(options: APIInteractionResponseCallbackDataWithFiles): Promise<APIMessage> {
        const message = await this.editFollowupMessage("@original", options);
        this.#originalMessageID = message.id;

        return message;
    }

    /**
     * Get a followup message for the interaction.
     *
     * @param messageID The ID of the message.
     * @returns The found message.
     */
    async getFollowupMessage(messageID: string): Promise<APIMessage> {
        return this.#client.api.webhooks.getMessage(this.applicationID, this.token, messageID);
    }

    /**
     * Get the initial interaction response.
     *
     * @returns The found message.
     */
    async getOriginalMessage(): Promise<APIMessage> {
        const message = await this.getFollowupMessage("@original");
        this.#originalMessageID = message.id;

        return message;
    }
}
