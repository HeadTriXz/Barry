import { Client, FastifyServer } from "@barry/core";

import { loadModules } from "./utils.js";
import { API } from "@discordjs/core";
import { Logger } from "@barry/logger";
import { REST } from "@discordjs/rest";

// Check environment variables.
if (process.env.DISCORD_CLIENT_ID === undefined) {
    throw new Error("Missing environment variable: DISCORD_CLIENT_ID");
}

if (process.env.DISCORD_PUBLIC_KEY === undefined) {
    throw new Error("Missing environment variable: DISCORD_PUBLIC_KEY");
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

process.on("uncaughtException", (error) => {
    logger.error(error);
});

// Initialize the server.
const server = new FastifyServer({
    publicKey: process.env.DISCORD_PUBLIC_KEY
});

// Initialize the client.
const rest = new REST().setToken(process.env.DISCORD_TOKEN);
const api = new API(rest);

const client = new Client({
    api: api,
    applicationID: process.env.DISCORD_CLIENT_ID,
    logger: logger,
    modules: loadModules("./modules"),
    server: server,
    serverEndpoint: process.env.SERVER_ENDPOINT
});

try {
    // Start the server.
    const serverHost = process.env.SERVER_HOST || "localhost";
    const serverPort = process.env.SERVER_PORT !== undefined
        ? Number(process.env.SERVER_PORT)
        : 3000;

    await server.listen(serverPort, serverHost);

    // Start the client.
    await client.initialize();
    if (process.env.NODE_ENV !== "production" && process.env.DEVELOPER_GUILDS !== undefined) {
        const guilds = process.env.DEVELOPER_GUILDS.trim().split(/\s*,\s*/);

        for (const command of client.commands) {
            command.guilds = guilds;
        }
    }

    await client.commands.sync();
} catch (error: unknown) {
    client.logger.fatal(error);
}
