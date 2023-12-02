import {
    type APIMessage,
    type GatewayIntentBits,
    API,
    GatewayDispatchEvents
} from "@discordjs/core";
import {
    type ConstructorArray,
    type Gateway,
    type Module,
    Client
} from "@barry-bot/core";
import { type RedisOptions, Redis } from "ioredis";
import type { BaseLogger } from "@barry-bot/logger";

import { PrismaClient } from "@prisma/client";
import { REST } from "@discordjs/rest";
import { WebSocketManager } from "@discordjs/ws";

/**
 * Options for an {@link Application}.
 */
export interface ApplicationOptions {
    /**
     * Discord-related configurations for the application.
     */
    discord: ApplicationDiscordOptions;

    /**
     * The logger used for logging messages.
     */
    logger?: BaseLogger;

    /**
     * An array of module classes to be added to the client.
     */
    modules: ConstructorArray<Module>;

    /**
     * Options for the Redis client.
     */
    redis: RedisOptions;
}

export interface ApplicationDiscordOptions {
    /**
     * The ID of the application.
     */
    applicationID: string;

    /**
     * The intents to be used for the gateway.
     */
    intents: GatewayIntentBits;

    /**
     * The token to use for authorization.
     */
    token: string;
}

/**
 * Represents the main client for Barry.
 */
export class Application extends Client {
    /**
     * The gateway connection for receiving and sending real-time events.
     */
    declare gateway: Gateway;

    /**
     * The Prisma client used for interacting with the database.
     */
    prisma: PrismaClient = new PrismaClient();

    /**
     * The Redis client used for caching.
     */
    redis: Redis;

    /**
     * Represents the main client for Barry.
     *
     * @param options Options for the client.
     */
    constructor(options: ApplicationOptions) {
        const rest = new REST().setToken(options.discord.token);

        super({
            api: new API(rest),
            applicationID: options.discord.applicationID,
            gateway: new WebSocketManager({
                intents: options.discord.intents,
                rest: rest,
                token: options.discord.token
            }),
            logger: options.logger,
            modules: options.modules
        });

        this.redis = new Redis(options.redis);
        this.setMaxListeners(200);
    }

    /**
     * Waits for a message in the provided channel.
     *
     * @param channelID The ID of the channel.
     * @param authorID The ID of the author to match.
     * @param timeout The timeout duration in milliseconds. Defaults to 15 minutes.
     * @returns The matching message or undefined if timed out.
     */
    async awaitMessage(
        channelID: string,
        authorID?: string,
        timeout: number = 15 * 60 * 1000
    ): Promise<APIMessage | undefined> {
        return new Promise((resolve) => {
            const cleanup = (message?: APIMessage): void => {
                this.off(GatewayDispatchEvents.MessageCreate, listener);

                clearTimeout(timeoutID);
                resolve(message);
            };

            const listener = (message: APIMessage): void => {
                if (authorID !== undefined && message.author.id !== authorID) {
                    return;
                }

                if (message.channel_id === channelID) {
                    cleanup(message);
                }
            };

            const timeoutID = setTimeout(cleanup, timeout);
            this.on(GatewayDispatchEvents.MessageCreate, listener);
        });
    }

    /**
     * Initializes the client.
     */
    override async initialize(): Promise<void> {
        await super.initialize();

        if (process.env.NODE_ENV !== "production" && process.env.DEVELOPER_GUILDS !== undefined) {
            const guilds = process.env.DEVELOPER_GUILDS.trim().split(/\s*,\s*/);

            for (const command of this.commands) {
                command.guilds = guilds;
            }
        }

        await this.commands.sync();
        await this.gateway.connect();
    }
}
