import type {
    AnyCommand,
    ApplicationCommandInteraction,
    AutocompleteInteraction,
    SlashCommand
} from "../../index.js";
import {
    type RESTPutAPIApplicationCommandsJSONBody,
    ApplicationCommandOptionType,
    ApplicationCommandType
} from "@discordjs/core";

import type { ApplicationCommandOptionWithOptions } from "../../commands/types.js";
import type { Client } from "../../Client.js";

/**
 * Represents a service for managing commands.
 */
export interface CommandRegistry {
    /**
     * The amount of registered commands.
     */
    size: number;

    /**
     * Returns an iterator over the registered commands.
     *
     * @returns An iterator over the commands.
     */
    [Symbol.iterator](): Iterator<AnyCommand>;

    /**
     * Adds a command to the registrar.
     *
     * @param command The command to add.
     */
    add(command: AnyCommand): void;

    /**
     * Deletes a command from the registrar.
     *
     * @param command The command to delete.
     */
    delete(command: AnyCommand): void;

    /**
     * Retrieves a command based on the provided interaction.
     *
     * @param interaction The received command interaction.
     * @return The command associated with the interaction, if found.
     */
    get(interaction: ApplicationCommandInteraction | AutocompleteInteraction): AnyCommand | undefined;

    /**
     * Synchronizes the registered commands with the Discord API.
     * This method updates both global and guild-specific commands.
     */
    sync(): Promise<void>;
}

/**
 * The command registrar responsible for registering commands.
 */
export class CommandService {
    /**
     * The client that has initialized the command registrar.
     */
    #client: Client;

    /**
     * The map of commands.
     */
    #commands: Map<string, AnyCommand> = new Map();

    /**
     * The command registrar responsible for registering commands.
     *
     * @param client The client that has initialized this command registrar.
     */
    constructor(client: Client) {
        this.#client = client;
    }

    /**
     * The amount of registered commands.
     */
    get size(): number {
        return this.#commands.size;
    }

    /**
     * Returns an iterator over the registered commands.
     *
     * @returns An iterator over the commands.
     */
    [Symbol.iterator](): Iterator<AnyCommand> {
        return this.#commands.values();
    }

    /**
     * Adds a command to the registrar.
     *
     * @param command The command to add.
     */
    add(command: AnyCommand): void {
        if (command.guilds?.length) {
            for (const guildID of command.guilds) {
                this.#commands.set(this.#getKey(command, guildID), command);
            }
        } else {
            this.#commands.set(this.#getKey(command), command);
        }
    }

    /**
     * Deletes a command from the registrar.
     *
     * @param command The command to delete.
     */
    delete(command: AnyCommand): void {
        if (command.guilds?.length) {
            for (const guildID of command.guilds) {
                this.#commands.delete(this.#getKey(command, guildID));
            }
        } else {
            this.#commands.delete(this.#getKey(command));
        }
    }

    /**
     * Retrieves a command based on the provided interaction.
     *
     * @param interaction The received command interaction.
     * @return The command associated with the interaction, if found.
     */
    get(interaction: ApplicationCommandInteraction | AutocompleteInteraction): AnyCommand | undefined {
        const key = `${interaction.data.guildID ?? "global"}:${interaction.data.type}:${interaction.data.name}`;
        const command = this.#commands.get(key);

        if (command !== undefined && interaction.data.isChatInput()) {
            if (command.type !== ApplicationCommandType.ChatInput) {
                throw new Error("Invalid command type. Expected \"CHAT_INPUT\" command.");
            }

            return this.#getSubcommand(command, interaction.data.options);
        }

        return command;
    }

    /**
     * Synchronizes the registered commands with the Discord API.
     * This method updates both global and guild-specific commands.
     */
    async sync(): Promise<void> {
        const guildCommands: Record<string, RESTPutAPIApplicationCommandsJSONBody> = {};
        const globalCommands: RESTPutAPIApplicationCommandsJSONBody = [];

        for (const [key, command] of this.#commands) {
            const [scope] = key.split(":", 1);
            const payload = command.toJSON();

            if (scope === "global") {
                globalCommands.push(payload);
            } else {
                guildCommands[scope] ??= [];
                guildCommands[scope].push(payload);
            }
        }

        if (globalCommands.length > 0) {
            await this.#client.api.applicationCommands
                .bulkOverwriteGlobalCommands(this.#client.applicationID, globalCommands);
        }

        for (const guildID in guildCommands) {
            await this.#client.api.applicationCommands
                .bulkOverwriteGuildCommands(this.#client.applicationID, guildID, guildCommands[guildID]);
        }
    }

    /**
     * Generates a unique key for a command based on its scope, type, and name.
     *
     * @param command The command for which to generate the key.
     * @returns The unique key for the command.
     */
    #getKey(command: AnyCommand, guildID?: string): string {
        return `${guildID ?? "global"}:${command.type}:${command.name}`;
    }

    /**
     * Retrieves the subcommand within the given parent command based on the provided options.
     * Recursively searches for the subcommand within nested subcommand groups.
     *
     * @param parent The parent command to search within.
     * @param options The options representing the subcommand hierarchy.
     * @returns The subcommand, if found.
     */
    #getSubcommand(
        parent: SlashCommand,
        options?: ApplicationCommandOptionWithOptions[]
    ): SlashCommand | undefined {
        const option = this.#getSubcommandOption(options);
        if (option === undefined) {
            return parent;
        }

        const subcommand = parent.children?.get(option.name);
        if (subcommand !== undefined) {
            return this.#getSubcommand(subcommand, option.options);
        }
    }

    /**
     * Retrieves the subcommand option from the given options array.
     *
     * @param options The options array to search within.
     * @returns The subcommand option, if found.
     */
    #getSubcommandOption(
        options?: ApplicationCommandOptionWithOptions[]
    ): ApplicationCommandOptionWithOptions | undefined {
        if (options === undefined) {
            return;
        }

        for (const option of options) {
            if (
                option.type === ApplicationCommandOptionType.Subcommand ||
                option.type === ApplicationCommandOptionType.SubcommandGroup
            ) {
                return option;
            }
        }
    }
}
