import { type PartialGuildMember, isAboveMember } from "../permissions.js";
import type { APIUser } from "@discordjs/core";
import type { ReplyableInteraction } from "@barry-bot/core";
import type { WarnOptions } from "../../../../types/moderation.js";
import type ModerationModule from "../../index.js";

import { CaseType } from "@prisma/client";
import { DiscordAPIError } from "@discordjs/rest";
import { respond } from "./actions.js";
import config from "../../../../config.js";

/**
 * Warns a user in the guild.
 *
 * @param module The moderation module.
 * @param interaction The interaction that triggered the command.
 * @param options The options for the command.
 */
export async function warn(
    module: ModerationModule,
    interaction: ReplyableInteraction,
    options: WarnOptions
): Promise<void> {
    if (!interaction.isInvokedInGuild()) {
        return;
    }

    if (options.member.user.id === interaction.user.id) {
        return respond(interaction, `${config.emotes.error} You cannot warn yourself.`);
    }

    if (options.member.user.id === module.client.applicationID) {
        return respond(interaction, `${config.emotes.error} Your attempt to warn me has been classified as a failed comedy show audition.`);
    }

    const guild = await module.client.api.guilds.get(interaction.guildID);
    if (!isAboveMember(guild, interaction.member, options.member)) {
        return respond(interaction, `${config.emotes.error} You cannot warn a member with a higher or equal role to you.`);
    }

    const self = await module.client.api.guilds.getMember(interaction.guildID, module.client.applicationID);
    if (!isAboveMember(guild, self as PartialGuildMember, options.member)) {
        return respond(interaction, `${config.emotes.error} I cannot warn a member with a higher or equal role to me.`);
    }

    const entity = await module.cases.create({
        creatorID: interaction.user.id,
        guildID: interaction.guildID,
        note: options.reason,
        type: CaseType.Warn,
        userID: options.member.user.id
    });

    try {
        const channel = await module.client.api.users.createDM(options.member.user.id);
        await module.client.api.channels.createMessage(channel.id, {
            embeds: [{
                color: config.defaultColor,
                description: `${config.emotes.error} You have been warned in **${guild.name}**`,
                fields: [{
                    name: "**Reason**",
                    value: options.reason
                }]
            }]
        });

        await createSuccessMessage(module, interaction, entity.id, options.member.user);
    } catch (error: unknown) {
        if (!(error instanceof DiscordAPIError) || error.code !== 50007) {
            module.client.logger.error(error);
        }

        await createSuccessMessage(module, interaction, entity.id, options.member.user, true);
    }

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

/**
 * Sends a success message to the user.
 *
 * @param module The moderation module.
 * @param interaction The interaction to reply to.
 * @param caseID The ID of the case.
 * @param user The user that has gotten warned.
 * @param isDisabled The user's DMs are disabled.
 */
async function createSuccessMessage(
    module: ModerationModule,
    interaction: ReplyableInteraction,
    caseID: number,
    user: APIUser,
    isDisabled: boolean = false
): Promise<void> {
    let content = `Successfully warned \`${user.username}\`.`;
    if (isDisabled) {
        content += " However, they have disabled their DMs, so I was unable to notify them.";
    }

    const warnings = await module.cases.getByUser(interaction.guildID!, user.id, CaseType.Warn);
    if (warnings.length === 2) {
        content += " They already have a warning; please review their previous cases and take action if needed.";
    } else if (warnings.length > 2) {
        content += ` They currently have \`${warnings.length - 1}\` warnings; please review their previous cases and take action if needed.`;
    }

    await respond(interaction, `${config.emotes.check} Case \`${caseID}\` | ${content}`);
}
