import { type PartialGuildMember, isAboveMember } from "../permissions.js";
import type { DWCOptions } from "../../../../types/moderation.js";
import type { FlaggableModule } from "../../types.js";
import type { ReplyableInteraction } from "@barry-bot/core";
import type ModerationModule from "../../index.js";

import { CaseType } from "@prisma/client";
import { DiscordAPIError } from "@discordjs/rest";
import { getDWCRole } from "../getDWCRole.js";
import { respond } from "./actions.js";
import config from "../../../../config.js";

/**
 * Marks a user as 'Deal With Caution'.
 *
 * @param module The moderation module.
 * @param interaction The interaction that triggered the command.
 * @param options The options for the command.
 */
export async function dwc(
    module: ModerationModule,
    interaction: ReplyableInteraction,
    options: DWCOptions
): Promise<void> {
    if (!interaction.isInvokedInGuild()) {
        return;
    }

    if (options.user.id === interaction.user.id) {
        return respond(interaction, `${config.emotes.error} You cannot flag yourself.`);
    }

    if (options.user.id === module.client.applicationID) {
        return respond(interaction, `${config.emotes.error} Your attempt to flag me has been classified as a failed comedy show audition.`);
    }

    const dwc = await module.dwcScheduledBans.get(interaction.guildID, options.user.id);
    if (dwc !== null) {
        return respond(interaction, `${config.emotes.error} That user is already flagged.`);
    }

    const guild = await module.client.api.guilds.get(interaction.guildID);
    if (options.member !== undefined) {
        if (!isAboveMember(guild, interaction.member, options.member)) {
            return respond(interaction, `${config.emotes.error} You cannot flag this member.`);
        }

        const self = await module.client.api.guilds.getMember(interaction.guildID, module.client.applicationID);
        if (!isAboveMember(guild, self as PartialGuildMember, options.member)) {
            return respond(interaction, `${config.emotes.error} I cannot flag this member.`);
        }
    }

    const profiles = module.client.modules.get<FlaggableModule>("marketplace.profiles");
    const requests = module.client.modules.get<FlaggableModule>("marketplace.requests");

    const settings = await module.settings.getOrCreate(interaction.guildID);
    const profilesSettings = await profiles?.settings.getOrCreate(interaction.guildID);
    const requestsSettings = await requests?.settings.getOrCreate(interaction.guildID);

    const role = await getDWCRole(module, settings, profilesSettings, requestsSettings);
    if (role === undefined) {
        return respond(interaction, `${config.emotes.error} Failed to create the DWC role.`);
    }

    if (options.member !== undefined) {
        try {
            await module.client.api.guilds.addRoleToMember(interaction.guildID, options.user.id, role.id, {
                reason: options.reason
            });
        } catch (error: unknown) {
            return respond(interaction, `${config.emotes.error} Failed to add the DWC role to the member.`);
        }
    }

    try {
        const guild = await module.client.api.guilds.get(interaction.guildID);
        const channel = await module.client.api.users.createDM(options.user.id);

        let content = `You have been marked with \`Deal With Caution\` in **${guild.name}**\n\n`;
        if (profilesSettings?.enabled || requestsSettings?.enabled) {
            content += "Meaning you cannot:\n- look at requests\n- create nor modify requests\n- advertise your services\n\n";
        }

        await module.client.api.channels.createMessage(channel.id, {
            embeds: [{
                color: config.defaultColor,
                description: `${config.emotes.error} ${content}In order to get this removed, please contact one of the staff members.\n**If you are still marked as Deal With Caution a week from now, you will automatically be banned.**`,
                fields: [{
                    name: "**Reason**",
                    value: options.reason
                }]
            }]
        });
    } catch (error: unknown) {
        if (!(error instanceof DiscordAPIError) || error.code !== 50007) {
            module.client.logger.error(error);
        }
    }

    await module.dwcScheduledBans.create(interaction.guildID, options.user.id);

    const entity = await module.cases.create({
        creatorID: interaction.user.id,
        guildID: interaction.guildID,
        note: options.reason,
        type: CaseType.DWC,
        userID: options.user.id
    });

    await respond(interaction, `${config.emotes.check} Case \`${entity.id}\` | Successfully flagged \`${options.user.username}\`.`);

    if (settings.channelID !== null) {
        await module.createLogMessage(settings.channelID, {
            case: entity,
            creator: interaction.user,
            reason: options.reason,
            user: options.user
        });
    }

    if (profilesSettings !== undefined && profilesSettings.channelID !== null) {
        await profiles?.flagUser(
            interaction.guildID,
            profilesSettings.channelID,
            options.user,
            options.reason
        );
    }

    if (requestsSettings !== undefined && requestsSettings.channelID !== null) {
        await requests?.flagUser(
            interaction.guildID,
            requestsSettings.channelID,
            options.user,
            options.reason
        );
    }
}
