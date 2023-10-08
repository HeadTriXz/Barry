import type { APIUser } from "@discordjs/core";
import type { ModuleWithSettings, BaseSettings } from "../../types/modules.js";

/**
 * Represents a module that allows flagging users.
 */
export interface FlaggableModule extends ModuleWithSettings<SettingsWithChannel> {
    /**
     * Flags all items for the specified user.
     *
     * @param guildID The ID of the guild.
     * @param channelID The ID of the channel.
     * @param user The user to flag.
     * @param reason The reason for flagging the user.
     */
    flagUser(guildID: string, channelID: string, user: APIUser, reason: string): Promise<void>;

    /**
     * Removes the flag from all items for the specified user.
     *
     * @param guildID The ID of the guild.
     * @param channelID The ID of the channel.
     * @param user The user to remove the flag of.
     */
    unflagUser(guildID: string, channelID: string, user: APIUser): Promise<void>;
}

/**
 * Represents settings with a channel.
 */
export interface SettingsWithChannel extends BaseSettings {
    /**
     * The ID of the channel.
     */
    channelID: string | null;

    /**
     * Whether the module is enabled.
     */
    enabled: boolean;
}
