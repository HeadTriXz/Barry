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
 * Represents an interaction.
 */
export class ReplyableInteraction extends Interaction {
    /**
     * The client that received the interaction.
     */
    #client: Client;

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
     * Waits for a message component response with the specified message and custom ID.
     *
     * @param messageID The ID of the message to listen for.
     * @param customID The custom ID to match.
     * @param timeout The timeout duration in milliseconds (default: 15 minutes).
     * @returns The matching MessageComponentInteraction or undefined if timed out.
     */
    async awaitMessageComponent(
        messageID: string,
        customID: string,
        timeout: number = 15 * 60 * 1000
    ): Promise<MessageComponentInteraction | void> {
        return new Promise<MessageComponentInteraction | void>((resolve) => {
            const listener = (interaction: AnyInteraction): void => {
                if (!interaction.isMessageComponent()) {
                    return;
                }

                if (interaction.message.id === messageID && interaction.data.customID === customID) {
                    this.#client.off(GatewayDispatchEvents.InteractionCreate, listener);
                    resolve(interaction);
                }
            };

            setTimeout(() => {
                this.#client.off(GatewayDispatchEvents.InteractionCreate, listener);
                resolve();
            }, timeout);

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
    ): Promise<ModalSubmitInteraction | void> {
        return new Promise<ModalSubmitInteraction | void>((resolve) => {
            const listener = (interaction: AnyInteraction): void => {
                if (!interaction.isModalSubmit()) {
                    return;
                }

                if (interaction.data.customID === customID) {
                    this.#client.off(GatewayDispatchEvents.InteractionCreate, listener);
                    resolve(interaction);
                }
            };

            setTimeout(() => {
                this.#client.off(GatewayDispatchEvents.InteractionCreate, listener);
                resolve();
            }, timeout);

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
        return this.editFollowupMessage("@original", options);
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
        return this.getFollowupMessage("@original");
    }
}
