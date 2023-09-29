import { type PartialGuildMember, isAboveMember } from "../permissions.js";
import type { KickOptions } from "../../../../types/moderation.js";
import type { ReplyableInteraction } from "@barry/core";
import type ModerationModule from "../../index.js";

import { CaseType } from "@prisma/client";
import { respond } from "./actions.js";
import config from "../../../../config.js";

/**
 * Kicks a user from the guild.
 *
 * @param module The moderation module.
 * @param interaction The interaction that triggered the command.
 * @param options The options for the kick.
 */
export async function kick(
    module: ModerationModule,
    interaction: ReplyableInteraction,
    options: KickOptions
): Promise<void> {
    if (!interaction.isInvokedInGuild()) {
        return;
    }

    if (options.member.user.id === interaction.user.id) {
        return respond(interaction, `${config.emotes.error} You cannot kick yourself.`);
    }

    if (options.member.user.id === module.client.applicationID) {
        return respond(interaction, `${config.emotes.error} Your attempt to kick me has been classified as a failed comedy show audition.`);
    }

    const guild = await module.client.api.guilds.get(interaction.guildID);
    if (!isAboveMember(guild, interaction.member, options.member)) {
        return respond(interaction, `${config.emotes.error} You cannot kick this member.`);
    }

    const self = await module.client.api.guilds.getMember(interaction.guildID, module.client.applicationID);
    if (!isAboveMember(guild, self as PartialGuildMember, options.member)) {
        return respond(interaction, `${config.emotes.error} I cannot kick this member.`);
    }

    await module.notifyUser({
        guild: guild,
        reason: options.reason,
        type: CaseType.Kick,
        userID: options.member.user.id
    });

    try {
        await module.client.api.guilds.removeMember(interaction.guildID, options.member.user.id, {
            reason: options.reason
        });
    } catch (error: unknown) {
        module.client.logger.error(error);

        return respond(interaction, `${config.emotes.error} Failed to kick this member.`);
    }

    const entity = await module.cases.create({
        creatorID: interaction.user.id,
        guildID: interaction.guildID,
        note: options.reason,
        type: CaseType.Kick,
        userID: options.member.user.id
    });

    await respond(interaction, `${config.emotes.check} Case \`${entity.id}\` | Successfully kicked \`${options.member.user.username}\`.`);

    const settings = await module.settings.getOrCreate(interaction.guildID);
    if (settings.channelID !== null) {
        await module.createLogMessage(settings.channelID, {
            case: entity,
            creator: interaction.user,
            reason: options.reason,
            user: options.member.user
        });
    }
}
