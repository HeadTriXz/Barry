import {
    type APIInteractionResponseCallbackData,
    GatewayDispatchEvents,
    MessageFlags
} from "@discordjs/core";
import {
    type AnyInteraction,
    type Module,
    Event
} from "@barry-bot/core";
import type ReportsModule from "../index.js";

import { ReportActionButton } from "../index.js";
import config from "../../../../../config.js";

/**
 * Represents a module which can generate content for an entity.
 */
export interface ModuleWithContent extends Module {
    /**
     * Returns the content for an entity.
     *
     * @param id The ID of the entity to get content for.
     * @returns The content for the entity.
     */
    getContent(id: string | number): Promise<APIInteractionResponseCallbackData>;
}

/**
 * Represents an event handler for viewing the origin of a report.
 */
export default class extends Event<ReportsModule> {
    /**
     * Represents an event handler for viewing the origin of a report.
     *
     * @param module The module the event belongs to.
     */
    constructor(module: ReportsModule) {
        super(module, GatewayDispatchEvents.InteractionCreate);
    }

    /**
     * Shows the origin (request or profile) of a report to the user.
     *
     * @param interaction The interaction that triggered 'View' button.
     */
    async execute(interaction: AnyInteraction): Promise<void> {
        const isValidInteraction = interaction.isInvokedInGuild()
            && interaction.isMessageComponent()
            && interaction.data.isButton()
            && interaction.data.customID === ReportActionButton.View;

        if (!isValidInteraction) {
            return;
        }

        const report = await this.module.localReports.getByThread(interaction.message.id, true);
        if (report === null) {
            return interaction.createMessage({
                content: `${config.emotes.error} Failed to find the report you're looking for.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const content = report.report.requestID !== null
            ? await this.client.modules.get<ModuleWithContent>("marketplace.requests")?.getContent(report.report.requestID)
            : await this.client.modules.get<ModuleWithContent>("marketplace.profiles")?.getContent(report.report.userID);

        if (content === undefined) {
            return interaction.createMessage({
                content: `${config.emotes.error} Failed to find the report you're looking for.`,
                flags: MessageFlags.Ephemeral
            });
        }

        content.flags = MessageFlags.Ephemeral;

        return interaction.createMessage(content);
    }
}
