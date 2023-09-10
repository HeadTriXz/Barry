import { type CaseLogOptions, getLogContent } from "./functions/getLogContent.js";
import { type ModerationSettings, CaseType } from "@prisma/client";
import type { APIGuild } from "@discordjs/core";
import type { Application } from "../../Application.js";

import {
    CaseNoteRepository,
    CaseRepository,
    ModerationSettingsRepository,
    TempBanRepository
} from "./database.js";
import { DiscordAPIError } from "@discordjs/rest";
import { Module } from "@barry/core";
import { loadCommands } from "../../utils/loadFolder.js";
import config from "../../config.js";

/**
 * Options for the 'notifyUser' function.
 */
export interface NotifyOptions {
    /**
     * The duration of the action in seconds, if applicable.
     */
    duration?: number;

    /**
     * The guild the action was taken in.
     */
    guild: APIGuild;

    /**
     * The reason for the action.
     */
    reason: string;

    /**
     * The type of action taken.
     */
    type: Exclude<CaseType, "Note">;

    /**
     * The ID of the user to notify.
     */
    userID: string;
}

/**
 * The words to use for each case type.
 */
const NOTIFY_WORDS: Record<Exclude<CaseType, "Note">, string> = {
    [CaseType.Ban]: "banned from",
    [CaseType.Kick]: "kicked from",
    [CaseType.Mute]: "muted in",
    [CaseType.Unban]: "unbanned from",
    [CaseType.Unmute]: "unmuted from",
    [CaseType.Warn]: "warned in"
};

/**
 * How often to check for expired temporary bans.
 */
const UNBAN_INTERVAL = 600000;

/**
 * Represents the moderation module.
 */
export default class ModerationModule extends Module<Application> {
    /**
     * Repository class for managing case notes.
     */
    caseNotes: CaseNoteRepository;

    /**
     * Repository class for managing moderation cases.
     */
    cases: CaseRepository;

    /**
     * Repository class for managing settings for this module.
     */
    moderationSettings: ModerationSettingsRepository;

    /**
     * Repository class for managing temporary bans.
     */
    tempBans: TempBanRepository;

    /**
     * Represents the moderation module.
     *
     * @param client The client that initialized this module.
     */
    constructor(client: Application) {
        super(client, {
            id: "moderation",
            name: "Moderation",
            description: "Easily moderate your server with powerful moderation commands.",
            commands: loadCommands("./commands")
        });

        this.caseNotes = new CaseNoteRepository(client.prisma);
        this.cases = new CaseRepository(client.prisma);
        this.moderationSettings = new ModerationSettingsRepository(client.prisma);
        this.tempBans = new TempBanRepository(client.prisma);
    }

    /**
     * Checks for expired temporary bans and unbans the users.
     */
    async checkExpiredBans(): Promise<void> {
        const bans = await this.tempBans.getExpired();
        if (bans.length === 0) {
            return;
        }

        const self = await this.client.api.users.get(this.client.applicationID);
        for (const ban of bans) {
            try {
                await this.client.api.guilds.unbanUser(ban.guildID, ban.userID);
            } catch (error: unknown) {
                if (!(error instanceof DiscordAPIError) || error.code !== 10026) {
                    this.client.logger.error(error);
                }
            }

            await this.tempBans.delete(ban.guildID, ban.userID);
            const entity = await this.cases.create({
                creatorID: this.client.applicationID,
                guildID: ban.guildID,
                note: "Temporary ban expired.",
                type: CaseType.Unban,
                userID: ban.userID
            });

            const settings = await this.moderationSettings.getOrCreate(ban.guildID);
            const user = await this.client.api.users.get(ban.userID);

            await this.createLogMessage({
                case: entity,
                creator: self,
                reason: "Temporary ban expired.",
                user: user
            }, settings);
        }
    }

    /**
     * Creates a log message in the configured log channel.
     *
     * @param options The options for the log message
     * @param settings The settings of this module.
     */
    async createLogMessage(options: CaseLogOptions, settings: ModerationSettings): Promise<void> {
        if (settings.channelID !== null) {
            try {
                const content = getLogContent(options);
                await this.client.api.channels.createMessage(settings.channelID, content);
            } catch (error: unknown) {
                if (error instanceof DiscordAPIError && error.code === 10003) {
                    await this.moderationSettings.upsert(settings.guildID, {
                        channelID: null
                    });
                }

                this.client.logger.error(error);
            }
        }
    }

    /**
     * Initializes the module.
     */
    override async initialize(): Promise<void> {
        await super.initialize();

        setInterval(() => {
            return this.checkExpiredBans();
        }, UNBAN_INTERVAL);
    }

    /**
     * Checks whether a user is banned from a guild.
     *
     * @param guildID The ID of the guild.
     * @param userID The ID of the user.
     * @returns Whether the user is banned.
     */
    async isBanned(guildID: string, userID: string): Promise<boolean> {
        return this.client.api.guilds.getMemberBan(guildID, userID)
            .then(() => true)
            .catch(() => false);
    }

    /**
     * Checks if the guild has enabled this module.
     *
     * @param guildID The ID of the guild to check.
     * @returns Whether the guild has enabled this module.
     */
    async isEnabled(guildID: string): Promise<boolean> {
        const settings = await this.moderationSettings.getOrCreate(guildID);
        return settings.enabled;
    }

    /**
     * Notifies a user that an action has been taken against them.
     *
     * @param options The options for the notification.
     */
    async notifyUser(options: NotifyOptions): Promise<void> {
        try {
            const channel = await this.client.api.users.createDM(options.userID);
            const fields = [{
                name: "**Reason**",
                value: options.reason
            }];

            if (options.duration !== undefined) {
                fields.push({
                    name: "**Duration**",
                    value: `Expires <t:${Math.trunc(((Date.now() / 1000) + options.duration))}:R>`
                });
            }

            await this.client.api.channels.createMessage(channel.id, {
                embeds: [{
                    color: config.defaultColor,
                    description: `${config.emotes.error} You have been ${NOTIFY_WORDS[options.type]} **${options.guild.name}**`,
                    fields: fields
                }]
            });
        } catch (error: unknown) {
            if (!(error instanceof DiscordAPIError) || error.code !== 50007) {
                this.client.logger.error(error);
            }
        }
    }
}
