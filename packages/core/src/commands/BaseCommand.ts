import type {
    ApplicationCommandType,
    LocalizationMap,
    RESTPostAPIApplicationCommandsJSONBody
} from "@discordjs/core";

import type { ApplicationCommandInteraction } from "../index.js";
import type { Module } from "../modules/index.js";

/**
 * Options for a {@link BaseCommand}.
 */
export interface ApplicationCommandOptions {
    /**
     * Set of permissions that the bot requires represented as a bit set.
     */
    appPermissions?: bigint;

    /**
     * The period during which the user cannot execute the same command (in seconds).
     */
    cooldown?: number;

    /**
     * Set of permissions that members require by default represented as a bit set.
     */
    defaultMemberPermissions?: bigint;

    /**
     * Whether the command can only be used inside a guild.
     */
    guildOnly?: boolean;

    /**
     * Array of guild IDs the command is available in.
     */
    guilds?: string[];

    /**
     * The name of the command.
     */
    name: string;

    /**
     * Localized versions of the name of the command.
     */
    nameLocalizations?: LocalizationMap;

    /**
     * Whether the command is age-restricted.
     */
    nsfw?: boolean;

    /**
     * Whether the command can only be used by developers.
     */
    ownerOnly?: boolean;
}

/**
 * Represents a command.
 * @abstract
 */
export abstract class BaseCommand<M extends Module = Module> {
    /**
     * Set of permissions represented as a bit set.
     */
    appPermissions?: bigint;

    /**
     * The client that initialized the command.
     */
    client: M["client"];

    /**
     * The period during which the user cannot execute the same command (in seconds).
     */
    cooldown?: number;

    /**
     * Set of permissions represented as a bit set.
     */
    defaultMemberPermissions?: bigint;

    /**
     * Whether the command can only be used inside a guild.
     */
    guildOnly: boolean;

    /**
     * Array of guild IDs the command is available in.
     */
    guilds?: string[];

    /**
     * The name of the command.
     */
    name: string;

    /**
     * Localized versions of the name of the command.
     */
    nameLocalizations?: LocalizationMap;

    /**
     * Whether the command is age-restricted.
     */
    nsfw?: boolean;

    /**
     * Whether the command can only be used by developers.
     */
    ownerOnly: boolean;

    /**
     * The type of application command.
     */
    abstract type: ApplicationCommandType;

    /**
     * Represents an application command.
     *
     * @param module The module this command belong to.
     * @param options Options for the command.
     */
    constructor(public module: M, options: ApplicationCommandOptions) {
        this.appPermissions = options.appPermissions;
        this.client = module.client;
        this.cooldown = options.cooldown ?? 3;
        this.defaultMemberPermissions = options.defaultMemberPermissions;
        this.guildOnly = options.guildOnly ?? false;
        this.guilds = options.guilds;
        this.name = options.name;
        this.nameLocalizations = options.nameLocalizations;
        this.nsfw = options.nsfw;
        this.ownerOnly = options.ownerOnly ?? false;
    }

    /**
     * Returns an object with the properties required to register a new command.
     */
    toJSON(): RESTPostAPIApplicationCommandsJSONBody {
        return {
            default_member_permissions: this.defaultMemberPermissions?.toString(),
            dm_permission: !this.guildOnly,
            name: this.name,
            name_localizations: this.nameLocalizations,
            nsfw: this.nsfw,
            type: this.type
        } as RESTPostAPIApplicationCommandsJSONBody;
    }

    /**
     * Returns a string representing the command.
     */
    toString(): string {
        const parent = Object.getPrototypeOf(this.constructor.prototype) as this;
        return `${parent.constructor.name}<${this.name}>`;
    }

    /**
     * Executes the command.
     *
     * @param interaction The interaction that triggered the command.
     */
    abstract execute(interaction: ApplicationCommandInteraction, ...args: any[]): Promise<void>;
}
