import {
    type ApplicationCommandType,
    type ApplicationIntegrationType,
    type LocalizationMap,
    type RESTPostAPIApplicationCommandsJSONBody,
    InteractionContextType
} from "@discordjs/core";

import type { ApplicationCommandInteraction } from "../index.js";
import type { Module } from "../modules/index.js";

/**
 * The default interaction contexts for a command.
 */
const DEFAULT_INTERACTION_CONTEXTS = [
    InteractionContextType.Guild,
    InteractionContextType.BotDM,
    InteractionContextType.PrivateChannel
];

/**
 * Options for a {@link BaseCommand}.
 */
export interface ApplicationCommandOptions {
    /**
     * Set of permissions that the bot requires represented as a bit set.
     */
    appPermissions?: bigint;

    /**
     * Array of interaction context(s) where the command can be used, only for globally-scoped commands.
     */
    contexts?: InteractionContextType[];

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
     * @deprecated Use `contexts` instead.
     */
    guildOnly?: boolean;

    /**
     * Array of guild IDs the command is available in.
     */
    guilds?: string[];

    /**
     * Array of installation context(s) where the command is available, only for globally-scoped commands.
     */
    integrationTypes?: ApplicationIntegrationType[];

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
     * Array of interaction context(s) where the command can be used. Defaults to all contexts.
     */
    contexts: InteractionContextType[];

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
     * @deprecated Use `contexts` instead.
     */
    guildOnly: boolean;

    /**
     * Array of guild IDs the command is available in.
     */
    guilds?: string[];

    /**
     * Array of installation context(s) where the command is available, only for globally-scoped commands.
     */
    integrationTypes?: ApplicationIntegrationType[];

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
        this.contexts = options.contexts ?? DEFAULT_INTERACTION_CONTEXTS;
        this.cooldown = options.cooldown ?? 3;
        this.defaultMemberPermissions = options.defaultMemberPermissions;
        this.guildOnly = options.guildOnly ?? false;

        if (options.guildOnly !== undefined && options.contexts === undefined) {
            console.warn("The 'guildOnly' option is deprecated. Please use the 'contexts' option instead.");

            this.contexts = options.guildOnly
                ? [InteractionContextType.Guild]
                : DEFAULT_INTERACTION_CONTEXTS;
        }

        if (options.contexts !== undefined) {
            this.guildOnly = options.contexts.length === 1 && options.contexts[0] === InteractionContextType.Guild;
        }

        this.guilds = options.guilds;
        this.integrationTypes = options.integrationTypes;
        this.name = options.name;
        this.nameLocalizations = options.nameLocalizations;
        this.nsfw = options.nsfw;
        this.ownerOnly = options.ownerOnly ?? false;
    }

    /**
     * Initializes the command.
     */
    async initialize(): Promise<void> {
        // Empty...
    }

    /**
     * Returns an object with the properties required to register a new command.
     */
    toJSON(): RESTPostAPIApplicationCommandsJSONBody {
        return {
            contexts: this.contexts,
            default_member_permissions: this.defaultMemberPermissions?.toString(),
            integration_types: this.integrationTypes,
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
