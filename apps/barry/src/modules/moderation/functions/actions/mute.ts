import { type PartialGuildMember, isAboveMember } from "../permissions.js";
import type { MuteOptions } from "../../../../types/moderation.js";
import type { ReplyableInteraction } from "@barry/core";
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
 * Times out a user in the guild.
 *
 * @param module The moderation module.
 * @param interaction The interaction that triggered the command.
 * @param options The options for the command.
 */
export async function mute(
    module: ModerationModule,
    interaction: ReplyableInteraction,
    options: MuteOptions
): Promise<void> {
    if (!interaction.isInvokedInGuild()) {
        return;
    }

    const duration = getDuration(options.duration);
    if (duration < 10) {
        return respond(interaction, `${config.emotes.error} The duration must at least be 10 seconds.`);
    }

    if (duration > MAX_DURATION) {
        return respond(interaction, `${config.emotes.error} The duration must not exceed 28 days.`);
    }

    if (options.member.user.id === interaction.user.id) {
        return respond(interaction, `${config.emotes.error} You cannot mute yourself.`);
    }

    if (options.member.user.id === module.client.applicationID) {
        return respond(interaction, `${config.emotes.error} Your attempt to mute me has been classified as a failed comedy show audition.`);
    }

    const guild = await module.client.api.guilds.get(interaction.guildID);
    if (!isAboveMember(guild, interaction.member, options.member)) {
        return respond(interaction, `${config.emotes.error} You cannot mute this member.`);
    }

    const self = await module.client.api.guilds.getMember(interaction.guildID, module.client.applicationID);
    if (!isAboveMember(guild, self as PartialGuildMember, options.member)) {
        return respond(interaction, `${config.emotes.error} I cannot mute this member.`);
    }

    try {
        await module.client.api.guilds.editMember(interaction.guildID, options.member.user.id, {
            communication_disabled_until: new Date(Date.now() + 1000 * duration).toISOString()
        }, {
            reason: options.reason
        });
    } catch (error: unknown) {
        module.client.logger.error(error);

        return respond(interaction, `${config.emotes.error} Failed to mute this member.`);
    }

    await module.notifyUser({
        duration: duration,
        guild: guild,
        reason: options.reason,
        type: CaseType.Mute,
        userID: options.member.user.id
    });

    const entity = await module.cases.create({
        creatorID: interaction.user.id,
        guildID: interaction.guildID,
        note: options.reason,
        type: CaseType.Mute,
        userID: options.member.user.id
    });

    await respond(interaction, `${config.emotes.check} Case \`${entity.id}\` | Successfully muted \`${options.member.user.username}\`.`);

    const settings = await module.settings.getOrCreate(interaction.guildID);
    if (settings.channelID !== null) {
        await module.createLogMessage(settings.channelID, {
            case: entity,
            creator: interaction.user,
            duration: duration,
            reason: options.reason,
            user: options.member.user
        });
    }
}
