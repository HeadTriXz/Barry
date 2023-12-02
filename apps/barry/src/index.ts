import { GatewayDispatchEvents, GatewayIntentBits } from "@discordjs/core";

import { Application } from "./Application.js";
import { Logger } from "@barry-bot/logger";
import { loadModules } from "./utils/index.js";

// Check environment variables.
if (process.env.DISCORD_CLIENT_ID === undefined) {
    throw new Error("Missing environment variable: DISCORD_CLIENT_ID");
}

if (process.env.DISCORD_TOKEN === undefined) {
    throw new Error("Missing environment variable: DISCORD_TOKEN");
}

// Initialize the logger.
const logger = new Logger({
    environment: process.env.NODE_ENV,
    sentry: {
        dsn: process.env.SENTRY_DSN
    }
});

// Initialize the application.
const app = new Application({
    discord: {
        applicationID: process.env.DISCORD_CLIENT_ID,
        intents: GatewayIntentBits.Guilds
            | GatewayIntentBits.GuildMembers
            | GatewayIntentBits.GuildMessages
            | GatewayIntentBits.GuildMessageReactions
            | GatewayIntentBits.GuildVoiceStates
            | GatewayIntentBits.MessageContent
            | GatewayIntentBits.DirectMessages,
        token: process.env.DISCORD_TOKEN
    },
    logger: logger,
    modules: loadModules("./modules"),
    redis: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT) || undefined
    }
});

process.on("uncaughtException", (error) => {
    logger.fatal(error);
});

app.on(GatewayDispatchEvents.Ready, ({ user }) => {
    logger.info(`Successfully logged in as ${user.username}#${user.discriminator}`);
});

app.initialize().catch((error) => {
    logger.fatal(error);
});
