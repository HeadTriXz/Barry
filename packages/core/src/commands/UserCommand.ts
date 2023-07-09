import {
    type APIInteractionDataResolvedGuildMember,
    type APIUser,
    ApplicationCommandType
} from "@discordjs/core";

import type { ApplicationCommandInteraction } from "../index.js";
import type { Module } from "../modules/Module.js";
import { BaseCommand } from "./BaseCommand.js";

/**
 * Represents the target of a user command.
 */
export interface UserCommandTarget {
    /**
     * The member object that is the target of the command, if in a guild.
     */
    member?: APIInteractionDataResolvedGuildMember;

    /**
     * The user object that is the target of the command.
     */
    user: APIUser;
}

/**
 * Represents a user command.
 * @abstract
 */
export abstract class UserCommand<M extends Module = Module> extends BaseCommand<M> {
    /**
     * The type of application command.
     */
    type: ApplicationCommandType.User = ApplicationCommandType.User;

    /**
     * Executes the user command.
     *
     * @param interaction The interaction that triggered the command.
     * @param target The resolved data provided with the command.
     */
    abstract execute(
        interaction: ApplicationCommandInteraction,
        target: UserCommandTarget
    ): Promise<void>;
}
