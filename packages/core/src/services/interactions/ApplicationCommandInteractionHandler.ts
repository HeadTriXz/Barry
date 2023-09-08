import {
    type APIApplicationCommandInteractionDataOption,
    ApplicationCommandOptionType,
    ApplicationCommandType
} from "@discordjs/core";
import type {
    ApplicationCommandInteraction,
    Client,
    InteractionResolvedData,
    SlashCommand
} from "../../index.js";
import type { InteractionHandler } from "./InteractionService.js";

/**
 * Represents a validation error that occurs during command execution.
 */
export class ValidationError extends Error {}

/**
 * Represents a handler that processes incoming application command interactions.
 */
export class ApplicationCommandInteractionHandler implements InteractionHandler {
    /**
     * The client that initialized the handler.
     */
    #client: Client;

    /**
     * Represents a handler that processes incoming application command interactions.
     *
     * @param client The client that initialized the handler.
     */
    constructor(client: Client) {
        this.#client = client;
    }

    /**
     * Handles the incoming interaction.
     *
     * @param interaction The interaction to handle.
     */
    async handle(interaction: ApplicationCommandInteraction): Promise<void> {
        const command = this.#client.commands.get(interaction);
        if (command === undefined) {
            return;
        }

        if (interaction.guildID !== undefined) {
            const moduleEnabled = await command.module.isEnabled(interaction.guildID);
            if (!moduleEnabled) {
                throw new ValidationError("This command is currently disabled for this guild.");
            }

            if (command.appPermissions !== undefined && interaction.appPermissions !== undefined) {
                const perms = interaction.appPermissions & command.appPermissions;
                if (perms !== command.appPermissions) {
                    throw new ValidationError("I have insufficient permissions to execute the command.");
                }
            }
        }

        if (command.cooldown !== undefined) {
            const key = `${interaction.guildID ?? "global"}:${command.name}:${interaction.user.id}`;
            const expiresAt = this.#client.cooldowns.get(key);

            if (expiresAt !== undefined) {
                throw new ValidationError(`Barry needs to rest his wings for a moment. Bee patient, he'll be back in action <t:${Math.trunc(expiresAt / 1000)}:R>.`);
            }

            this.#client.cooldowns.set(key, command.cooldown * 1000);
        }

        try {
            switch (interaction.data.type) {
                case ApplicationCommandType.ChatInput: {
                    if (command.type !== ApplicationCommandType.ChatInput) {
                        throw new Error("Invalid command type. Expected \"CHAT_INPUT\" command.");
                    }

                    const options = this.#getResolvedOptions(
                        interaction.data.options ?? [],
                        interaction.data.resolved,
                        command
                    );

                    await command.execute(interaction, options);
                    break;
                }
                case ApplicationCommandType.Message: {
                    if (command.type !== ApplicationCommandType.Message) {
                        throw new Error("Invalid command type. Expected \"MESSAGE\" command.");
                    }

                    const message = interaction.data.resolved.messages.get(interaction.data.targetID);
                    if (message === undefined) {
                        throw new Error("Could not retrieve target message.");
                    }

                    await command.execute(interaction, { message });
                    break;
                }
                case ApplicationCommandType.User: {
                    if (command.type !== ApplicationCommandType.User) {
                        throw new Error("Invalid command type. Expected \"USER\" command.");
                    }

                    const member = interaction.data.resolved.members.get(interaction.data.targetID);
                    const user = interaction.data.resolved.users.get(interaction.data.targetID);

                    if (user === undefined) {
                        throw new Error("Could not retrieve target user.");
                    }

                    await command.execute(interaction, { member, user });
                    break;
                }
                default: {
                    throw new Error("Unknown application command type.");
                }
            }
        } catch (error: unknown) {
            this.#client.logger.error("An error occurred while executing the command:", error);
        }
    }

    /**
     * Retrieves the resolved options for the interaction.
     *
     * @param options Parameters for the invoked application command.
     * @param resolved The resolved data for the interaction.
     * @param command The command associated with the interaction.
     * @returns The resolved options as a record.
     */
    #getResolvedOptions(
        options: APIApplicationCommandInteractionDataOption[],
        resolved: InteractionResolvedData,
        command: SlashCommand
    ): Record<string, unknown> {
        const result: Record<string, unknown> = {};

        for (const option of options) {
            switch (option.type) {
                default:
                case ApplicationCommandOptionType.String:
                case ApplicationCommandOptionType.Integer:
                case ApplicationCommandOptionType.Boolean:
                case ApplicationCommandOptionType.Number: {
                    result[option.name] = option.value;
                    break;
                }
                case ApplicationCommandOptionType.User: {
                    if (command.options.find((x) => x.name === option.name)?.isMember) {
                        const member = resolved.members.get(option.value);
                        if (member === undefined) {
                            throw new Error("Could not retrieve target member.");
                        }

                        result[option.name] = member;
                    } else {
                        result[option.name] = resolved.users.get(option.value);
                    }
                    break;
                }
                case ApplicationCommandOptionType.Channel: {
                    result[option.name] = resolved.channels.get(option.value);
                    break;
                }
                case ApplicationCommandOptionType.Role: {
                    result[option.name] = resolved.roles.get(option.value);
                    break;
                }
                case ApplicationCommandOptionType.Mentionable: {
                    result[option.name] = resolved.members.get(option.value)
                        ?? resolved.users.get(option.value)
                        ?? resolved.roles.get(option.value);
                    break;
                }
                case ApplicationCommandOptionType.Attachment: {
                    result[option.name] = resolved.attachments.get(option.value);
                    break;
                }
                case ApplicationCommandOptionType.Subcommand:
                case ApplicationCommandOptionType.SubcommandGroup: {
                    if (option.options !== undefined) {
                        const temp = this.#getResolvedOptions(option.options, resolved, command);
                        for (const key in temp) {
                            result[key] = temp[key];
                        }
                    }
                    break;
                }
            }
        }

        return result;
    }
}
