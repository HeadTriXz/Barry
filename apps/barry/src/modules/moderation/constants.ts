import { CaseType } from "@prisma/client";
import config, { type Emoji } from "../../config.js";

/**
 * The emojis to use for each case type.
 */
export const CASE_EMOJIS: Record<CaseType, Emoji> = {
    [CaseType.Ban]: config.emotes.ban,
    [CaseType.DWC]: config.emotes.dwc,
    [CaseType.Kick]: config.emotes.kick,
    [CaseType.Mute]: config.emotes.mute,
    [CaseType.Note]: config.emotes.note,
    [CaseType.UnDWC]: config.emotes.undwc,
    [CaseType.Unban]: config.emotes.unban,
    [CaseType.Unmute]: config.emotes.unmute,
    [CaseType.Warn]: config.emotes.warn
};

/**
 * The titles to use for each case type.
 */
export const CASE_TITLES: Record<CaseType, string> = {
    [CaseType.Ban]: "Ban",
    [CaseType.DWC]: "DWC",
    [CaseType.Kick]: "Kick",
    [CaseType.Mute]: "Mute",
    [CaseType.Note]: "Note",
    [CaseType.UnDWC]: "UnDWC",
    [CaseType.Unban]: "Unban",
    [CaseType.Unmute]: "Unmute",
    [CaseType.Warn]: "Warn"
};

/**
 * Pre-defined reasons for severe moderation actions.
 */
export const COMMON_SEVERE_REASONS = [
    "Suspicious or spam account",
    "Compromised or hacked account",
    "Being abusive or disrespectful",
    "Scamming or wasting a someone's time",
    "Violating Discord's Terms of Service",
    "Violating server rules",
    "Trolling"
];

/**
 * Pre-defined reasons for minor moderation actions.
 */
export const COMMON_MINOR_REASONS = [
    "Being abusive or disrespectful",
    "Spamming",
    "Trolling",
    "Self-promoting without permission",
    "Sending NSFW or obscene content",
    "Violating server rules"
];

/**
 * Pre-defined reasons for the 'Deal With Caution' command.
 */
export const COMMON_DWC_REASONS = [
    "Not paying for services",
    "Wasting a someone's time",
    "Not responding after receiving final product",
    "Not delivering the work to the client",
    "Selling work that is not theirs"
];

/**
 * How often to check for expired scheduled bans.
 */
export const DWC_BAN_INTERVAL = 600000;

/**
 * The reason to display for expired bans.
 */
export const DWC_BAN_REASON = "User did not resolve issue.";

/**
 * The words to use for each case type.
 */
export const NOTIFY_WORDS: Record<Exclude<CaseType, "Note" | "DWC" | "UnDWC">, string> = {
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
export const UNBAN_INTERVAL = 600000;

/**
 * The reason to display when a user no longer has the DWC role.
 */
export const UNKNOWN_UNDWC_REASON = "The DWC role was removed manually. The user will not be banned.";
