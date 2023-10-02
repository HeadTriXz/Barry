import { type ReportsSettings, ReportCategory } from "@prisma/client";
import type { Application } from "../../../../Application.js";
import type { ModuleWithSettings } from "../../../../types/modules.js";

import {
    LocalReportRepository,
    ReportRepository,
    ReportsSettingsRepository
} from "./database/index.js";
import {
    REPORT_DEFAULT_REQUEST_REASONS,
    REPORT_DEFAULT_PROFILE_REASONS
} from "./constants.js";
import { Module } from "@barry/core";
import { loadEvents } from "../../../../utils/loadFolder.js";

/**
 * Represents buttons for managing reports.
 */
export enum ReportActionButton {
    View = "view_report",
    Action = "action_report"
}

/**
 * Represents the reports module.
 */
export default class ReportsModule extends Module<Application> implements ModuleWithSettings<ReportsSettings> {
    /**
     * Represents a repository for managing local reports.
     */
    localReports: LocalReportRepository;

    /**
     * Represents a repository for managing reports.
     */
    reports: ReportRepository;

    /**
     * Represents a repository for managing settings of this module.
     */
    settings: ReportsSettingsRepository;

    /**
     * Represents the reports module.
     *
     * @param client The client that initialized the module.
     */
    constructor(client: Application) {
        super(client, {
            id: "reports",
            name: "Reports",
            description: "Allows users to report other users in the marketplace.",
            events: loadEvents("./events")
        });

        this.localReports = new LocalReportRepository(client.prisma);
        this.reports = new ReportRepository(client.prisma);
        this.settings = new ReportsSettingsRepository(client.prisma);
    }


    /**
     * Returns the category for the specified reason.
     *
     * @param reason The reason to get the category for.
     * @returns The category for the specified reason.
     */
    getCategoryFromReason(reason: string): ReportCategory {
        for (const [category, reasons] of Object.entries(REPORT_DEFAULT_REQUEST_REASONS)) {
            if (reasons.includes(reason)) {
                return category as ReportCategory;
            }
        }

        for (const [category, reasons] of Object.entries(REPORT_DEFAULT_PROFILE_REASONS)) {
            if (reasons.includes(reason)) {
                return category as ReportCategory;
            }
        }

        return ReportCategory.Other;
    }

    /**
     * Returns the configured ID of the tag corresponding the specified category.
     *
     * @param settings The settings of the guild.
     * @param category The category to get the tag for.
     * @returns The ID of the tag corresponding the specified category, if configured.
     */
    getTagFromCategory(settings: ReportsSettings, category: ReportCategory): string | null {
        switch (category) {
            case ReportCategory.Copyright:
                return settings.tagCopyright;
            case ReportCategory.FalseInformation:
                return settings.tagFalseInformation;
            case ReportCategory.Inappropriate:
                return settings.tagInappropriate;
            case ReportCategory.ScamsFraud:
                return settings.tagScamsFraud;
            case ReportCategory.Other:
                return settings.tagOther;
            default:
                return null;
        }
    }

    /**
     * Checks if the guild has enabled this module.
     *
     * @returns Whether the guild has enabled this module.
     */
    isEnabled(): boolean {
        return true;
    }
}
