import type { APIGuild, APIUser } from "@discordjs/core";
import { type CaseLogOptions, getLogContent } from "./functions/getLogContent.js";
import {
    type ExpiredDWCScheduledBan,
    CaseNoteRepository,
    CaseRepository,
    DWCScheduledBanRepository,
    ModerationSettingsRepository,
    TempBanRepository
} from "./database.js";
import type { ProfilesModule, RequestsModule } from "./types.js";
import type { Application } from "../../Application.js";

import { CaseType } from "@prisma/client";
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
    type: Exclude<CaseType, "Note" | "DWC" | "UnDWC">;

    /**
     * The ID of the user to notify.
     */
    userID: string;
}

/**
 * The words to use for each case type.
 */
const NOTIFY_WORDS: Record<Exclude<CaseType, "Note" | "DWC" | "UnDWC">, string> = {
    [CaseType.Ban]: "banned from",
    [CaseType.Kick]: "kicked from",
    [CaseType.Mute]: "muted in",
    [CaseType.Unban]: "unbanned from",
    [CaseType.Unmute]: "unmuted from",
    [CaseType.Warn]: "warned in"
};

/**
 * How often to check for expired scheduled bans.
 */
const DWC_BAN_INTERVAL = 600000;

/**
 * The reason to display for expired bans.
 */
const DWC_BAN_REASON = "User did not resolve issue.";

/**
 * How often to check for expired temporary bans.
 */
const UNBAN_INTERVAL = 600000;

/**
 * The reason to display when a user no longer has the DWC role.
 */
const UNKNOWN_UNDWC_REASON = "The DWC role was removed manually. The user will not be banned.";

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
     * Repository class for managing scheduled bans.
     */
    dwcScheduledBans: DWCScheduledBanRepository;

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
        this.dwcScheduledBans = new DWCScheduledBanRepository(client.prisma);
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
            if (settings.channelID !== null) {
                const user = await this.client.api.users.get(ban.userID);
                await this.createLogMessage(settings.channelID, {
                    case: entity,
                    creator: self,
                    reason: "Temporary ban expired.",
                    user: user
                });
            }
        }
    }

    /**
     * Checks for expired scheduled bans and bans the users.
     */
    async checkScheduledBans(): Promise<void> {
        const bans = await this.dwcScheduledBans.getExpired();
        if (bans.length === 0) {
            return;
        }

        const creator = await this.client.api.users.get(this.client.applicationID);
        for (const ban of bans) {
            try {
                const member = await this.client.api.guilds.getMember(ban.guild_id, ban.user_id);
                if (member.user === undefined) {
                    throw new Error("Missing required property 'user' on member.");
                }

                if (ban.dwc_role_id === null || !member.roles.includes(ban.dwc_role_id)) {
                    await this.unflagUser(creator, member.user, ban);
                } else {
                    await this.punishFlaggedUser(creator, member.user, ban);
                }
            } catch (error: unknown) {
                if (error instanceof DiscordAPIError && error.code === 10007) {
                    const user = await this.client.api.users.get(ban.user_id);

                    await this.punishFlaggedUser(creator, user, ban);
                } else {
                    this.client.logger.error(error);
                }
            }

            await this.dwcScheduledBans.delete(ban.guild_id, ban.user_id);
        }
    }

    /**
     * Creates a log message in the configured log channel.
     *
     * @param channelID The ID of the log channel.
     * @param options The options for the log message.
     */
    async createLogMessage(channelID: string, options: CaseLogOptions): Promise<void> {
        try {
            const content = getLogContent(options);
            await this.client.api.channels.createMessage(channelID, content);
        } catch (error: unknown) {
            if (error instanceof DiscordAPIError && error.code === 10003) {
                await this.moderationSettings.upsert(options.case.guildID, {
                    channelID: null
                });
            }

            this.client.logger.error(error);
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

        setInterval(() => {
            return this.checkScheduledBans();
        }, DWC_BAN_INTERVAL);
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

    /**
     * Bans a flagged user.
     *
     * @param self The client user.
     * @param user The flagged user to ban.
     * @param ban The scheduled ban.
     */
    async punishFlaggedUser(self: APIUser, user: APIUser, ban: ExpiredDWCScheduledBan): Promise<void> {
        await this.client.api.guilds.banUser(ban.guild_id, ban.user_id, {}, {
            reason: DWC_BAN_REASON
        });

        const entity = await this.cases.create({
            creatorID: this.client.applicationID,
            guildID: ban.guild_id,
            note: DWC_BAN_REASON,
            type: CaseType.Ban,
            userID: ban.user_id
        });

        const guild = await this.client.api.guilds.get(ban.guild_id);
        await this.notifyUser({
            guild: guild,
            reason: DWC_BAN_REASON,
            type: CaseType.Ban,
            userID: ban.user_id
        });

        if (ban.channel_id !== null) {
            await this.createLogMessage(ban.channel_id, {
                case: entity,
                creator: self,
                reason: DWC_BAN_REASON,
                user: user
            });
        }
    }

    /**
     * Removes the flag from the user.
     *
     * @param self The client user.
     * @param user The user to remove the flag of.
     * @param ban The scheduled ban.
     */
    async unflagUser(self: APIUser, user: APIUser, ban: ExpiredDWCScheduledBan): Promise<void> {
        const entity = await this.cases.create({
            creatorID: this.client.applicationID,
            guildID: ban.guild_id,
            note: UNKNOWN_UNDWC_REASON,
            type: CaseType.UnDWC,
            userID: user.id
        });

        const marketplace = this.client.modules.get("marketplace");
        const profiles = marketplace?.dependencies.get("profiles") as ProfilesModule;
        const requests = marketplace?.dependencies.get("requests") as RequestsModule;

        if (profiles !== undefined) {
            const profilesSettings = await profiles.profilesSettings.getOrCreate(ban.guild_id);
            if (profilesSettings.channelID !== null) {
                await profiles.unflagUser(ban.guild_id, profilesSettings.channelID, user);
            }
        }

        if (requests !== undefined) {
            const requestsSettings = await requests.requestsSettings.getOrCreate(ban.guild_id);
            if (requestsSettings.channelID !== null) {
                await requests.unflagUser(ban.guild_id, requestsSettings.channelID, user);
            }
        }

        if (ban.channel_id !== null) {
            await this.createLogMessage(ban.channel_id, {
                case: entity,
                creator: self,
                reason: UNKNOWN_UNDWC_REASON,
                user: user
            });
        }
    }
}
