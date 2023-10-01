import {
    type APIRole,
    PermissionFlagsBits,
    OverwriteType
} from "@discordjs/core";
import type { ModerationSettings } from "@prisma/client";
import type { SettingsWithChannel } from "../types.js";
import type ModerationModule from "../index.js";

import config from "../../../config.js";

/**
 * Retrieves or creates the 'Deal With Caution' role.
 *
 * @param module The moderation module.
 * @param settings The moderation settings for the guild.
 * @param profilesSettings The profiles settings for the guild.
 * @param requestsSettings The requests settings for the guild.
 * @returns The 'Deal With Caution' role, or undefined if it failed to create it.
 */
export async function getDWCRole(
    module: ModerationModule,
    settings: ModerationSettings,
    profilesSettings?: SettingsWithChannel,
    requestsSettings?: SettingsWithChannel
): Promise<APIRole | undefined> {
    if (settings.dwcRoleID !== undefined) {
        const roles = await module.client.api.guilds.getRoles(settings.guildID);
        const role = roles.find((r) => r.id === settings.dwcRoleID);

        if (role !== undefined) {
            return role;
        }
    }

    try {
        const role = await module.client.api.guilds.createRole(settings.guildID, {
            color: config.defaultDWCColor,
            hoist: true,
            name: "Deal With Caution"
        });

        await module.settings.upsert(settings.guildID, {
            dwcRoleID: role.id
        });

        if (profilesSettings !== undefined && profilesSettings.channelID !== null) {
            await module.client.api.channels.editPermissionOverwrite(profilesSettings.channelID, role.id, {
                deny: PermissionFlagsBits.ViewChannel.toString(),
                type: OverwriteType.Role
            });
        }

        if (requestsSettings !== undefined && requestsSettings.channelID !== null) {
            await module.client.api.channels.editPermissionOverwrite(requestsSettings.channelID, role.id, {
                deny: PermissionFlagsBits.ViewChannel.toString(),
                type: OverwriteType.Role
            });
        }

        return role;
    } catch (error: unknown) {
        module.client.logger.error(error);
    }
}
