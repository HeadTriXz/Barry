import { type APIMessage, ApplicationCommandType } from "@discordjs/core";

import type { ApplicationCommandInteraction } from "../index.js";
import type { Module } from "../modules/Module.js";
import { BaseCommand } from "./BaseCommand.js";

/**
 * Represents the target of a message command.
 */
export interface MessageCommandTarget {
    /**
     * The message object that is the target of the command.
     */
    message: APIMessage;
}

/**
 * Represents a message command.
 * @abstract
 */
export abstract class MessageCommand<M extends Module = Module> extends BaseCommand<M> {
    /**
     * The type of application command.
     */
    type: ApplicationCommandType.Message = ApplicationCommandType.Message;

    /**
     * Executes the message command.
     *
     * @param interaction The interaction that triggered the command.
     * @param target The resolved data provided with the command.
     */
    abstract execute(
        interaction: ApplicationCommandInteraction,
        target: MessageCommandTarget
    ): Promise<void>;
}
