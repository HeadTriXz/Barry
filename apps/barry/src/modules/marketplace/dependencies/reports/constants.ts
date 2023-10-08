import {
    ReportCategory,
    ReportStatus,
    ReportType
} from "@prisma/client";

/**
 * The title for each report category.
 */
export const REPORT_CATEGORY_TITLE: Record<ReportCategory, string> = {
    [ReportCategory.Copyright]: "Copyright Violation",
    [ReportCategory.FalseInformation]: "False Information",
    [ReportCategory.Inappropriate]: "Inappropriate",
    [ReportCategory.ScamsFraud]: "Scams & Fraud",
    [ReportCategory.Other]: "Other"
};

/**
 * The title for each report status.
 */
export const REPORT_STATUS_TITLE: Record<ReportStatus, string> = {
    [ReportStatus.Open]: "Open",
    [ReportStatus.Accepted]: "Accepted",
    [ReportStatus.Ignored]: "Ignored"
};

/**
 * The title for each report type.
 */
export const REPORT_TYPE_TITLE: Record<ReportType, string> = {
    [ReportType.Profile]: "Profile",
    [ReportType.Request]: "Request"
};

/**
 * The tags for the reports channel.
 */
export const REPORT_CHANNEL_TAGS = [
    REPORT_STATUS_TITLE[ReportStatus.Open],
    REPORT_STATUS_TITLE[ReportStatus.Accepted],
    REPORT_STATUS_TITLE[ReportStatus.Ignored],
    REPORT_CATEGORY_TITLE[ReportCategory.Inappropriate],
    REPORT_CATEGORY_TITLE[ReportCategory.ScamsFraud],
    REPORT_CATEGORY_TITLE[ReportCategory.FalseInformation],
    REPORT_CATEGORY_TITLE[ReportCategory.Copyright],
    REPORT_CATEGORY_TITLE[ReportCategory.Other]
];

/**
 * The default reasons for reporting a request.
 */
export const REPORT_DEFAULT_REQUEST_REASONS: Record<ReportCategory, string[]> = {
    [ReportCategory.Inappropriate]: [
        "The request contains explicit or inappropriate content.",
        "The request is promoting illegal activities."
    ],
    [ReportCategory.ScamsFraud]: [
        "The user is not paying for services after receiving the final work."
    ],
    [ReportCategory.FalseInformation]: [
        "The request provides false or misleading information about the job."
    ],
    [ReportCategory.Copyright]: [],
    [ReportCategory.Other]: []
};

/**
 * The default reasons for reporting a profile.
 */
export const REPORT_DEFAULT_PROFILE_REASONS: Record<ReportCategory, string[]> = {
    [ReportCategory.Inappropriate]: [
        "The user's profile contains explicit or inappropriate content.",
        "The user's profile is promoting illegal activities."
    ],
    [ReportCategory.ScamsFraud]: [
        "The user is not responding after receiving payment.",
        "The user is not delivering the final product after payment."
    ],
    [ReportCategory.FalseInformation]: [
        "The user's profile provides false or misleading information about their skills or services."
    ],
    [ReportCategory.Copyright]: [
        "The user is advertising with work that is not their own."
    ],
    [ReportCategory.Other]: []
};

/**
 * The actions that can be taken on a report.
 */
export enum ReportAction {
    Ignore = "ignore",
    None = "none",
    Ban = "ban",
    Blacklist = "blacklist",
    BlacklistReporter = "blacklist_reporter",
    DWC = "dwc",
    Kick = "kick",
    Mute = "mute",
    Warn = "warn",
    WarnReporter = "warn_reporter"
}

/**
 * The base actions that can be taken on a report.
 */
export const REPORT_BASE_ACTIONS = [
    {
        description: "Take no action and mark the report as resolved.",
        label: "Mark as Resolved",
        value: ReportAction.None
    },
    {
        description: "Take no action and ignore this report.",
        label: "Mark as Ignored",
        value: ReportAction.Ignore
    }
];

/**
 * The actions that can be taken by global moderators.
 */
export const REPORT_GLOBAL_ACTIONS = [
    {
        description: "Blacklist the user from the marketplace.",
        label: "Blacklist",
        value: ReportAction.Blacklist
    },
    {
        description: "Blacklist the reporter for false reporting.",
        label: "Blacklist Reporter",
        value: ReportAction.BlacklistReporter
    },
    ...REPORT_BASE_ACTIONS
];

/**
 * The actions that can be taken by local moderators.
 */
export const REPORT_LOCAL_ACTIONS = [
    {
        description: "Ban the user from the server.",
        label: "Ban",
        value: ReportAction.Ban
    },
    {
        description: "Place the user under DWC.",
        label: "DWC",
        value: ReportAction.DWC
    },
    {
        description: "Kick the user from the server.",
        label: "Kick",
        value: ReportAction.Kick
    },
    {
        description: "Mute the user in the server.",
        label: "Mute",
        value: ReportAction.Mute
    },
    {
        description: "Warn the user.",
        label: "Warn",
        value: ReportAction.Warn
    },
    {
        description: "Warn the reporter for false reporting.",
        label: "Warn Reporter",
        value: ReportAction.WarnReporter
    },
    ...REPORT_BASE_ACTIONS
];
