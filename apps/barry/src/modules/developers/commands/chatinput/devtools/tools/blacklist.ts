import type { UpdatableInteraction } from "@barry-bot/core";
import type DevelopersModule from "../../../../index.js";

import { ComponentType, TextInputStyle } from "@discordjs/core";
import { timeoutContent } from "../../../../../../common.js";
import config from "../../../../../../config.js";

/**
 * Blacklists a guild.
 *
 * @param module The developers module.
 * @param interaction The interaction that triggered the tool.
 */
export async function blacklistGuild(module: DevelopersModule, interaction: UpdatableInteraction): Promise<void> {
    const key = `blacklist-guild-${Date.now()}`;
    await interaction.createModal({
        components: [{
            components: [{
                custom_id: "guild",
                label: "Guild ID",
                placeholder: "Enter the guild you want to blacklist.",
                style: TextInputStyle.Short,
                type: ComponentType.TextInput
            }],
            type: ComponentType.ActionRow
        }],
        custom_id: key,
        title: "Blacklist Guild"
    });

    const response = await interaction.awaitModalSubmit(key);
    if (response === undefined) {
        return interaction.editParent(timeoutContent);
    }

    const guildID = response.values.guild;
    try {
        const guild = await module.client.api.guilds.get(guildID);
        const isBlacklisted = await module.blacklistedGuilds.isBlacklisted(guildID);
        if (isBlacklisted) {
            return response.editParent({
                content: `${config.emotes.error} The guild you provided is already blacklisted.`,
                components: []
            });
        }

        await module.blacklistedGuilds.blacklist(guildID);
        await module.client.api.users
            .leaveGuild(guildID)
            .catch(() => undefined);

        await response.editParent({
            components: [],
            content: `${config.emotes.check} Successfully blacklisted \`${guild.name}\`.`
        });
    } catch {
        return response.editParent({
            content: `${config.emotes.error} The guild you provided does not exist.`,
            components: []
        });
    }
}

/**
 * Blacklists a user.
 *
 * @param module The developers module.
 * @param interaction The interaction that triggered the tool.
 */
export async function blacklistUser(module: DevelopersModule, interaction: UpdatableInteraction): Promise<void> {
    await interaction.editParent({
        components: [{
            components: [{
                custom_id: "user",
                placeholder: "Enter the user you want to blacklist.",
                type: ComponentType.UserSelect
            }],
            type: ComponentType.ActionRow
        }],
        content: `### ${config.emotes.add} Who do you want to blacklist?`
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
    if (isBlacklisted) {
        return response.editParent({
            content: `${config.emotes.error} The user you provided is already blacklisted.`,
            components: []
        });
    }

    await module.blacklistedUsers.blacklist(userID);

    await response.editParent({
        components: [],
        content: `${config.emotes.check} Successfully blacklisted \`${user.username}\`.`
    });
}
