import { type Client, Module, ValidationError } from "@barry/core";

import { loadCommands } from "../../utils/index.js";
import config from "../../config.js";

/**
 * Represents the general module.
 */
export default class GeneralModule extends Module {
    /**
     * Represents the general module.
     *
     * @param client The client that initialized the module.
     */
    constructor(client: Client) {
        super(client, {
            id: "general",
            name: "General",
            description: "Provides general functionality and commands.",
            commands: loadCommands("./commands")
        });
    }

    /**
     * Initializes the module.
     */
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

                await next();
            } catch (error: unknown) {
                if (interaction.isApplicationCommand() && error instanceof ValidationError) {
                    return interaction.createMessage({
                        content: `${config.emotes.error} ${error.message}`
                    });
                }

                this.client.logger.error(error);
            }
        });
    }
}
