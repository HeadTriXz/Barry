import type { AnyInteraction, Awaitable, Client } from "../../index.js";
import { GatewayDispatchEvents, InteractionType } from "@discordjs/core";
import { ApplicationCommandInteractionHandler } from "./ApplicationCommandInteractionHandler.js";
import { AutocompleteInteractionHandler } from "./AutocompleteInteractionHandler.js";
import { PingInteractionHandler } from "./PingInteractionHandler.js";

/**
 * Represents the function to call the next handler.
 */
export type NextHandler = () => Awaitable<void>;

/**
 * Represents a middleware function for processing interactions.
 */
export type InteractionMiddleware = (interaction: AnyInteraction, next: NextHandler) => Awaitable<void>;

/**
 * Represents a handler that processes incoming interactions.
 */
export interface InteractionHandler {
    /**
     * Handles the incoming interaction.
     *
     * @param interaction The interaction to handle.
     */
    handle(interaction: AnyInteraction): Awaitable<void>;
}

/**
 * Represents a handler that processes incoming interactions.
 */
export interface MiddlewareCapableHandler extends InteractionHandler {
    /**
     * Adds middleware to the interaction handler.
     *
     * @param middleware The middleware to be added.
     */
    addMiddleware(middleware: InteractionMiddleware): void;
}

/**
 * Represents a service for processing incoming interactions.
 */
export class InteractionService implements MiddlewareCapableHandler {
    /**
     * The handlers for different interaction types.
     */
    handlers: Partial<Record<InteractionType, InteractionHandler>>;

    /**
     * The client that initialized the service.
     */
    #client: Client;

    /**
     * The middleware registered for the interaction service.
     */
    #middleware: InteractionMiddleware[] = [];

    /**
     * Represents a service for processing incoming interactions.
     *
     * @param client The client that initialized the service.
     */
    constructor(client: Client) {
        this.#client = client;
        this.handlers = {
            [InteractionType.ApplicationCommand]: new ApplicationCommandInteractionHandler(client),
            [InteractionType.ApplicationCommandAutocomplete]: new AutocompleteInteractionHandler(client),
            [InteractionType.Ping]: new PingInteractionHandler()
        };
    }

    /**
     * Adds middleware to the interaction handler.
     *
     * @param middleware The middleware to be added.
     */
    addMiddleware(middleware: InteractionMiddleware): void {
        this.#middleware.push(middleware);
    }

    /**
     * Handles the incoming interaction.
     *
     * @param interaction The interaction to handle.
     */
    async handle(interaction: AnyInteraction): Promise<void> {
        const middlewareChain = this.#middleware.reduceRight(
            (next: NextHandler, middleware: InteractionMiddleware) => {
                return () => middleware(interaction, next);
            },
            () => {
                this.#client.emit(GatewayDispatchEvents.InteractionCreate, interaction);

                const handler = this.handlers[interaction.type];
                if (handler !== undefined) {
                    return handler.handle(interaction);
                }
            }
        );

        await middlewareChain();
    }
}
