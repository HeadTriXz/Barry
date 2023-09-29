import type { APIGuild, APIUser } from "@discordjs/core";
import { type Case, CaseType } from "@prisma/client";
import { type CaseLogOptions, getLogContent } from "./functions/getLogContent.js";
import {
    type ExpiredDWCScheduledBan,
    CaseNoteRepository,
    CaseRepository,
    DWCScheduledBanRepository,
    ModerationSettingsRepository,
    TempBanRepository
} from "./database/index.js";
import type { Application } from "../../Application.js";
import type { BaseModerationModule } from "../../types/moderation.js";
import type { FlaggableModule } from "./types.js";

import {
    DWC_BAN_INTERVAL,
    DWC_BAN_REASON,
    NOTIFY_WORDS,
    UNBAN_INTERVAL,
    UNKNOWN_UNDWC_REASON
} from "./constants.js";
import { DiscordAPIError } from "@discordjs/rest";
import { ModerationActions } from "./functions/actions/actions.js";
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
 * Options for the 'unflagUser' function.
 */
export interface UnflagOptions {
    /**
     * The ID of the configured log channel.
     */
    channelID: string | null;

    /**
     * The creator of the case.
     */
    creator: APIUser;

    /**
     * The ID of the guild.
     */
    guildID: string;

    /**
     * The reason for removing the flag.
     */
    reason: string;

    /**
     * The user to remove the flag of.
     */
    user: APIUser;
}

/**
 * Represents the moderation module.
 */
export default class ModerationModule extends Module<Application> implements BaseModerationModule {
    /**
     * Actions that can be performed on a user.
     */
    actions: ModerationActions;

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
    settings: ModerationSettingsRepository;

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

        this.actions = new ModerationActions(this);
        this.caseNotes = new CaseNoteRepository(client.prisma);
        this.cases = new CaseRepository(client.prisma);
        this.dwcScheduledBans = new DWCScheduledBanRepository(client.prisma);
        this.settings = new ModerationSettingsRepository(client.prisma);
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

            const settings = await this.settings.getOrCreate(ban.guildID);
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
                    await this.unflagUser({
                        channelID: ban.channel_id,
                        creator: creator,
                        guildID: ban.guild_id,
                        reason: UNKNOWN_UNDWC_REASON,
                        user: member.user
                    });
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
                await this.settings.upsert(options.case.guildID, {
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
        const settings = await this.settings.getOrCreate(guildID);
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
        await this.client.api.guilds.banUser(ban.guild_id, user.id, {}, {
            reason: DWC_BAN_REASON
        });

        const entity = await this.cases.create({
            creatorID: this.client.applicationID,
            guildID: ban.guild_id,
            note: DWC_BAN_REASON,
            type: CaseType.Ban,
            userID: user.id
        });

        const guild = await this.client.api.guilds.get(ban.guild_id);
        await this.notifyUser({
            guild: guild,
            reason: DWC_BAN_REASON,
            type: CaseType.Ban,
            userID: user.id
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
     * @param options The options for removing the flag.
     */
    async unflagUser(options: UnflagOptions): Promise<Case> {
        const entity = await this.cases.create({
            creatorID: options.creator.id,
            guildID: options.guildID,
            note: options.reason,
            type: CaseType.UnDWC,
            userID: options.user.id
        });

        const profiles = this.client.modules.get<FlaggableModule>("marketplace.profiles");
        const requests = this.client.modules.get<FlaggableModule>("marketplace.requests");

        if (profiles !== undefined) {
            const profilesSettings = await profiles.settings.getOrCreate(options.guildID);
            if (profilesSettings.channelID !== null) {
                await profiles.unflagUser(options.guildID, profilesSettings.channelID, options.user);
            }
        }

        if (requests !== undefined) {
            const requestsSettings = await requests.settings.getOrCreate(options.guildID);
            if (requestsSettings.channelID !== null) {
                await requests.unflagUser(options.guildID, requestsSettings.channelID, options.user);
            }
        }

        if (options.channelID !== null) {
            await this.createLogMessage(options.channelID, {
                case: entity,
                creator: options.creator,
                reason: options.reason,
                user: options.user
            });
        }

        return entity;
    }
}
