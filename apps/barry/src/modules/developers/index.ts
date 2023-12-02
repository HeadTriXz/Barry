import type { Application } from "../../Application.js";
import type { BlacklistableModule } from "../../types/blacklist.js";

import { Module, ValidationError } from "@barry-bot/core";
import { loadCommands, loadEvents } from "../../utils/index.js";
import { BlacklistedGuildRepository } from "./database/BlacklistedGuildRepository.js";
import { BlacklistedUserRepository } from "./database/BlacklistedUserRepository.js";
import { MessageFlags } from "@discordjs/core";
import config from "../../config.js";

/**
 * Represents the developers module.
 */
export default class DevelopersModule extends Module<Application> implements BlacklistableModule {
    /**
     * Represents the repository for managing blacklisted guilds.
     */
    blacklistedGuilds: BlacklistedGuildRepository;

    /**
     * Represents the repository for managing blacklisted users.
     */
    blacklistedUsers: BlacklistedUserRepository;

    /**
     * Represents the developers module.
     *
     * @param client The client that initialized the module.
     */
    constructor(client: Application) {
        super(client, {
            id: "developers",
            name: "Developers",
            description: "A set of useful tools for the developers of Barry.",
            commands: loadCommands("./commands"),
            events: loadEvents("./events")
        });

        this.blacklistedGuilds = new BlacklistedGuildRepository(client.prisma);
        this.blacklistedUsers = new BlacklistedUserRepository(client.prisma);
    }

    override async initialize(): Promise<void> {
        await super.initialize();

        this.client.interactions.addMiddleware(async (interaction, next) => {
            try {
                if (interaction.isApplicationCommand()) {
                    const command = this.client.commands.get(interaction);
                    if (command === undefined) {
                        return;
                    }

                    if (command.ownerOnly) {
                        const developers = process.env.DEVELOPER_USERS?.trim().split(/\s*,\s*/);

                        if (!developers?.includes(interaction.user.id)) {
                            throw new ValidationError("You are not permitted to use that command.");
                        }
                    }
                }

                const isBlacklisted = await this.blacklistedUsers.isBlacklisted(interaction.user.id);
                if (isBlacklisted) {
                    throw new ValidationError("You are blacklisted from interacting with me.");
                }

                await next();
            } catch (error: unknown) {
                if (error instanceof ValidationError) {
                    const isReplyable = interaction.isApplicationCommand()
                        || interaction.isMessageComponent()
                        || interaction.isModalSubmit();

                    if (isReplyable) {
                        return interaction.createMessage({
                            content: `${config.emotes.error} ${error.message}`,
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    if (interaction.isAutocomplete()) {
                        return interaction.result([{
                            name: error.message,
                            value: "error"
                        }]);
                    }
                }

                this.client.logger.error(error);
            }
        });
    }

    /**
     * Checks if the guild has enabled this module.
     *
     * @returns Whether the guild has enabled this module.
     */
    isEnabled(): boolean {
        return true;
    }
}
