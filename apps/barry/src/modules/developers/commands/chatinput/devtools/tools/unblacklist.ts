import type { UpdatableInteraction } from "@barry/core";
import type DevelopersModule from "../../../../index.js";

import { ComponentType, TextInputStyle } from "@discordjs/core";
import { timeoutContent } from "../../../../../marketplace/constants.js";
import config from "../../../../../../config.js";

/**
 * Unblacklists a guild.
 *
 * @param module The developers module.
 * @param interaction The interaction that triggered the tool.
 */
export async function unblacklistGuild(module: DevelopersModule, interaction: UpdatableInteraction): Promise<void> {
    const key = `unblacklist-guild-${Date.now()}`;
    await interaction.createModal({
        components: [{
            components: [{
                custom_id: "guild",
                label: "Guild ID",
                placeholder: "Enter the guild you want to unblacklist.",
                style: TextInputStyle.Short,
                type: ComponentType.TextInput
            }],
            type: ComponentType.ActionRow
        }],
        custom_id: key,
        title: "Unblacklist Guild"
    });

    const response = await interaction.awaitModalSubmit(key);
    if (response === undefined) {
        return interaction.editParent(timeoutContent);
    }

    const guildID = response.values.guild;
    try {
        const guild = await module.client.api.guilds.get(guildID);
        const isBlacklisted = await module.blacklistedGuilds.isBlacklisted(guildID);
        if (!isBlacklisted) {
            return response.editParent({
                content: `${config.emotes.error} The guild you provided is not blacklisted.`,
                components: []
            });
        }

        await module.blacklistedGuilds.unblacklist(guildID);

        await response.editParent({
            components: [],
            content: `${config.emotes.check} Successfully unblacklisted \`${guild.name}\`.`
        });
    } catch {
        return response.editParent({
            content: `${config.emotes.error} The guild you provided does not exist.`,
            components: []
        });
    }
}

/**
 * Unblacklists a user.
 *
 * @param module The developers module.
 * @param interaction The interaction that triggered the tool.
 */
export async function unblacklistUser(module: DevelopersModule, interaction: UpdatableInteraction): Promise<void> {
    await interaction.editParent({
        components: [{
            components: [{
                custom_id: "user",
                placeholder: "Enter the user you want to unblacklist.",
                type: ComponentType.UserSelect
            }],
            type: ComponentType.ActionRow
        }],
        content: `### ${config.emotes.add} Who do you want to unblacklist?`
    });

    const response = await interaction.awaitMessageComponent({
        customIDs: ["user"]
    });

    if (!response?.data.isUserSelect()) {
        return interaction.editParent(timeoutContent);
    }

    const userID = response.data.values[0];
    const user = response.data.resolved.users.get(userID);
    if (user === undefined) {
        return response.editParent({
            content: `${config.emotes.error} The user you provided does not exist.`,
            components: []
        });
    }

    const isBlacklisted = await module.blacklistedUsers.isBlacklisted(userID);
    if (!isBlacklisted) {
        return response.editParent({
            content: `${config.emotes.error} The user you provided is not blacklisted.`,
            components: []
        });
    }

    await module.blacklistedUsers.unblacklist(userID);

    await response.editParent({
        content: `${config.emotes.check} Successfully unblacklisted \`${user.username}\`.`,
        components: []
    });
}
