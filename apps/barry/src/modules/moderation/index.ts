import { type CaseLogOptions, getLogContent } from "./functions/getLogContent.js";
import { type ModerationSettings, CaseType } from "@prisma/client";
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
}
