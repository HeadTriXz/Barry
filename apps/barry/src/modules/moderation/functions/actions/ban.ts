import { type PartialGuildMember, isAboveMember } from "../permissions.js";
import type { BanOptions } from "../../../../types/moderation.js";
import type { ReplyableInteraction } from "@barry-bot/core";
import type ModerationModule from "../../index.js";

import { CaseType } from "@prisma/client";
import { getDuration } from "../getDuration.js";
import { respond } from "./actions.js";
import config from "../../../../config.js";

/**
 * The maximum duration in seconds (28 days).
 */
const MAX_DURATION = 2419200;

/**
 * The minimum duration in seconds (1 minute).
 */
const MIN_DURATION = 60;

/**
 * Bans a user from the guild.
 *
 * @param module The moderation module.
 * @param interaction The interaction that triggered the command.
 * @param options The options for the ban.
 */
export async function ban(
    module: ModerationModule,
    interaction: ReplyableInteraction,
    options: BanOptions
): Promise<void> {
    if (!interaction.isInvokedInGuild()) {
        return;
    }

    let duration: number | undefined;
    if (options.duration !== undefined) {
        duration = getDuration(options.duration);
        if (duration < MIN_DURATION) {
            return respond(interaction, `${config.emotes.error} The duration must at least be 60 seconds.`);
        }

        if (duration > MAX_DURATION) {
            return respond(interaction, `${config.emotes.error} The duration must not exceed 28 days.`);
        }
    }

    if (options.user.id === interaction.user.id) {
        return respond(interaction, `${config.emotes.error} You cannot ban yourself.`);
    }

    if (options.user.id === module.client.applicationID) {
        return respond(interaction, `${config.emotes.error} Your attempt to ban me has been classified as a failed comedy show audition.`);
    }

    const guild = await module.client.api.guilds.get(interaction.guildID);
    if (options.member !== undefined) {
        if (!isAboveMember(guild, interaction.member, options.member)) {
            return respond(interaction, `${config.emotes.error} You cannot ban this member.`);
        }

        const self = await module.client.api.guilds.getMember(interaction.guildID, module.client.applicationID);
        if (!isAboveMember(guild, self as PartialGuildMember, options.member)) {
            return respond(interaction, `${config.emotes.error} I cannot ban this member.`);
        }
    }

    const tempBan = await module.tempBans.get(interaction.guildID, options.user.id);
    const isBanned = options.member === undefined
        && await module.isBanned(interaction.guildID, options.user.id);

    if (tempBan !== null) {
        if (duration === undefined) {
            await module.tempBans.delete(interaction.guildID, options.user.id);
        } else {
            await module.tempBans.update(interaction.guildID, options.user.id, duration);
        }
    } else if (duration !== undefined) {
        await module.tempBans.create(interaction.guildID, options.user.id, duration);
    } else if (isBanned) {
        return respond(interaction, `${config.emotes.error} This user is already banned.`);
    }

    if (options.member !== undefined) {
        await module.notifyUser({
            duration: duration,
            guild: guild,
            reason: options.reason,
            type: CaseType.Ban,
            userID: options.user.id
        });
    }

    if (!isBanned) {
        try {
            await module.client.api.guilds.banUser(interaction.guildID, options.user.id, {
                delete_message_seconds: options.delete ? 604800 : 0
            }, {
                reason: options.reason
            });
        } catch (error: unknown) {
            module.client.logger.error(error);

            return respond(interaction, `${config.emotes.error} Failed to ban this member.`);
        }
    }

    const entity = await module.cases.create({
        creatorID: interaction.user.id,
        guildID: interaction.guildID,
        note: options.reason,
        type: CaseType.Ban,
        userID: options.user.id
    });

    await respond(interaction, `${config.emotes.check} Case \`${entity.id}\` | Successfully banned \`${options.user.username}\`.`);

    const settings = await module.settings.getOrCreate(interaction.guildID);
    if (settings.channelID !== null) {
        await module.createLogMessage(settings.channelID, {
            case: entity,
            creator: interaction.user,
            duration: duration,
            reason: options.reason,
            user: options.user
        });
    }
}
