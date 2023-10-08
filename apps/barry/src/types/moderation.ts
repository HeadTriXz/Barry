import type { APIUser } from "@discordjs/core";
import type { ModuleWithSettings } from "./modules.js";
import type { ModerationSettings } from "@prisma/client";
import type { PartialGuildMember } from "../modules/moderation/functions/permissions.js";
import type { ReplyableInteraction } from "@barry/core";

/**
 * Bans a user from the guild.
 *
 * @param interaction The interaction that triggered the command.
 * @param options The options for the ban.
 */
export type BanFunction = (interaction: ReplyableInteraction, options: BanOptions) => Promise<void>;

/**
 * Marks a user as 'Deal With Caution'.
 *
 * @param interaction The interaction that triggered the command.
 * @param options The options for the command.
 */
export type DWCFunction = (interaction: ReplyableInteraction, options: DWCOptions) => Promise<void>;

/**
 * Kicks a user from the guild.
 *
 * @param interaction The interaction that triggered the command.
 * @param options The options for the kick.
 */
export type KickFunction = (interaction: ReplyableInteraction, options: KickOptions) => Promise<void>;

/**
 * Times out a user in the guild.
 *
 * @param interaction The interaction that triggered the command.
 * @param options The options for the mute.
 */
export type MuteFunction = (interaction: ReplyableInteraction, options: MuteOptions) => Promise<void>;

/**
 * Warns a user in the guild.
 *
 * @param interaction The interaction that triggered the command.
 * @param options The options for the warn.
 */
export type WarnFunction = (interaction: ReplyableInteraction, options: WarnOptions) => Promise<void>;

/**
 * Options for the ban command.
 */
export interface BanOptions {
    /**
     * Whether to delete the user's messages.
     */
    delete?: boolean;

    /**
     * The duration of the ban.
     */
    duration?: string;

    /**
     * The member to ban.
     */
    member?: PartialGuildMember;

    /**
     * The reason for the ban.
     */
    reason: string;

    /**
     * The user to ban.
     */
    user: APIUser;
}

/**
 * Options for the deal with caution command.
 */
export interface DWCOptions {
    /**
     * The member to mark as 'Deal With Caution'.
     */
    member?: PartialGuildMember;

    /**
     * The reason to flag the user.
     */
    reason: string;

    /**
     * The user to mark as 'Deal With Caution'.
     */
    user: APIUser;
}

/**
 * Options for the kick command.
 */
export interface KickOptions {
    /**
     * The member to kick.
     */
    member: PartialGuildMember;

    /**
     * The reason for the kick.
     */
    reason: string;
}

/**
 * Options for the mute command.
 */
export interface MuteOptions {
    /**
     * The duration of the mute.
     */
    duration: string;

    /**
     * The member to mute.
     */
    member: PartialGuildMember;

    /**
     * The reason for the mute.
     */
    reason: string;
}

/**
 * Options for the warn command.
 */
export interface WarnOptions {
    /**
     * The member to warn.
     */
    member: PartialGuildMember;

    /**
     * The reason for the warning.
     */
    reason: string;
}

/**
 * Represents actions that can be performed on a user.
 */
export interface BaseModerationActions {
    /**
     * Bans a user from the guild.
     *
     * @param interaction The interaction that triggered the command.
     * @param options The options for the ban.
     */
    ban: BanFunction;

    /**
     * Marks a user as 'Deal With Caution'.
     *
     * @param interaction The interaction that triggered the command.
     * @param options The options for the command.
     */
    dwc: DWCFunction;

    /**
     * Kicks a user from the guild.
     *
     * @param interaction The interaction that triggered the command.
     * @param options The options for the kick.
     */
    kick: KickFunction;

    /**
     * Times out a user in the guild.
     *
     * @param interaction The interaction that triggered the command.
     * @param options The options for the mute.
     */
    mute: MuteFunction;

    /**
     * Warns a user in the guild.
     *
     * @param interaction The interaction that triggered the command.
     * @param options The options for the warn.
     */
    warn: WarnFunction;
}

/**
 * Represents a moderation module.
 */
export interface BaseModerationModule extends ModuleWithSettings<ModerationSettings> {
    /**
     * Actions that can be performed on a user.
     */
    actions: BaseModerationActions;
}
