import {
    type APIAttachment,
    type APIChannel,
    type APIInteraction,
    type APIInteractionDataResolvedChannel,
    type APIInteractionGuildMember,
    type APIRole,
    type APIUser,
    type LocaleString,
    InteractionType,
    Routes
} from "@discordjs/core";
import { type Client, getCreatedAt } from "../index.js";

import type { ApplicationCommandInteraction } from "./ApplicationCommandInteraction.js";
import type { AutocompleteInteraction } from "./AutocompleteInteraction.js";
import type { MessageComponentInteraction } from "./MessageComponentInteraction.js";
import type { ModalSubmitInteraction } from "./ModalSubmitInteraction.js";
import type { PingInteraction } from "./PingInteraction.js";
import type { ResponseHandler, ResponseOptions } from "../Server.js";

/**
 * Represents an interaction.
 */
export type AnyInteraction = ApplicationCommandInteraction
    | AutocompleteInteraction
    | MessageComponentInteraction
    | ModalSubmitInteraction
    | PingInteraction;

/**
 * Represents an interaction that has been invoked in a guild.
 */
export type GuildInteraction<T extends Interaction> = T & Required<Pick<T, "guildID" | "guildLocale" | "member">>;

/**
 * Resolved data for an interaction.
 */
export interface InteractionResolvedData {
    /**
     * A map of resolved attachments.
     */
    attachments: Map<string, APIAttachment>;

    /**
     * A map of resolved partial channels.
     */
    channels: Map<string, APIInteractionDataResolvedChannel>;

    /**
     * A map of resolved members.
     */
    members: Map<string, Omit<APIInteractionGuildMember, "deaf" | "mute">>;

    /**
     * A map of resolved roles.
     */
    roles: Map<string, APIRole>;

    /**
     * A map of resolved users.
     */
    users: Map<string, APIUser>;
}

/**
 * Represents an interaction.
 */
export class Interaction {
    /**
     * Whether the interaction got acknowledged.
     */
    acknowledged: boolean = false;

    /**
     * Bitwise set of permissions the app or bot has within the channel the interaction was sent from.
     */
    appPermissions?: bigint;

    /**
     * The ID of the application this interaction is for.
     */
    applicationID: string;

    /**
     * The channel it was sent from.
     */
    channel?: Partial<APIChannel> & Pick<APIChannel, "id" | "type">;

    /**
     * The client that received the interaction.
     */
    client?: Client;

    /**
     * The guild it was sent from.
     */
    guildID?: string;

    /**
     * The guild's preferred locale, if invoked in a guild.
     */
    guildLocale?: LocaleString;

    /**
     * The ID of the interaction.
     */
    id: string;

    /**
     * Guild member data for the invoking user, including permissions.
     */
    member?: APIInteractionGuildMember;

    /**
     * A continuation token for responding to the interaction.
     */
    token: string;

    /**
     * The type of interaction.
     */
    type: InteractionType;

    /**
     * User object for the invoking user.
     */
    user: APIUser;

    /**
     * Read-only property, always `1`.
     */
    version: 1;

    /**
     * Represents an interaction.
     *
     * @param data The raw interaction.
     * @param client The client that received the interaction.
     */
    constructor(data: APIInteraction, client?: Client, respond?: ResponseHandler) {
        if (data.app_permissions !== undefined) {
            this.appPermissions = BigInt(data.app_permissions);
        }

        this.applicationID = data.application_id;
        this.channel = data.channel;
        this.guildID = data.guild_id;
        this.guildLocale = data.guild_locale;
        this.id = data.id;
        this.member = data.member;
        this.token = data.token;
        this.type = data.type;
        this.user = data.user ?? data.member!.user;
        this.version = data.version;

        if (client !== undefined) {
            this.client = client;
        }

        if (respond !== undefined) {
            this.createResponse = respond;
        }
    }

    /**
     * The timestamp of when the interaction got created.
     */
    get createdAt(): number {
        return getCreatedAt(this.id);
    }

    /**
     * Creates a response for the interaction.
     *
     * @param options The options for the response.
     */
    async createResponse(options: ResponseOptions<any>): Promise<void> {
        if (this.client === undefined) {
            throw new Error("Cannot send a response without a valid client.");
        }

        await this.client.api.rest.post(Routes.interactionCallback(this.id, this.token), {
            auth: false,
            body: options.body,
            files: options.files,
            headers: options.headers
        });
    }

    /**
     * Checks if this interaction is an application command interaction.
     *
     * @returns Whether this interaction is an application command interaction.
     */
    isApplicationCommand(): this is ApplicationCommandInteraction {
        return this.type === InteractionType.ApplicationCommand;
    }

    /**
     * Checks if this interaction is an autocomplete interaction.
     *
     * @returns Whether this interaction is an autocomplete interaction.
     */
    isAutocomplete(): this is AutocompleteInteraction {
        return this.type === InteractionType.ApplicationCommandAutocomplete;
    }

    /**
     * Checks if this interaction has been invoked in a guild.
     *
     * @returns Whether this interaction has been invoked in a guild.
     */
    isInvokedInGuild(): this is GuildInteraction<this> {
        return this.guildID !== undefined;
    }

    /**
     * Checks if this interaction is a message component interaction.
     *
     * @returns Whether this interaction is a message component interaction.
     */
    isMessageComponent(): this is MessageComponentInteraction {
        return this.type === InteractionType.MessageComponent;
    }

    /**
     * Checks if this interaction is a modal submit interaction.
     *
     * @returns Whether this interaction is a modal submit interaction.
     */
    isModalSubmit(): this is ModalSubmitInteraction {
        return this.type === InteractionType.ModalSubmit;
    }

    /**
     * Checks if this interaction is a ping interaction.
     *
     * @returns Whether this interaction is a ping interaction.
     */
    isPing(): this is PingInteraction {
        return this.type === InteractionType.Ping;
    }
}
