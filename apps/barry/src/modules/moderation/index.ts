import { type CaseLogOptions, getLogContent } from "./functions/getLogContent.js";
import type { Application } from "../../Application.js";
import type { ModerationSettings } from "@prisma/client";

import {
    CaseNoteRepository,
    CaseRepository,
    ModerationSettingsRepository
} from "./database.js";
import { DiscordAPIError } from "@discordjs/rest";
import { Module } from "@barry/core";
import { loadCommands } from "../../utils/loadFolder.js";

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
