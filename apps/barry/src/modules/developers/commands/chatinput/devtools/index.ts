import { type ApplicationCommandInteraction, SlashCommand } from "@barry-bot/core";
import type DevelopersModule from "../../../index.js";

import { ComponentType, MessageFlags } from "@discordjs/core";
import {
    blacklistGuild,
    blacklistUser,
    unblacklistGuild,
    unblacklistUser
} from "./tools/index.js";
import { timeoutContent } from "../../../../../common.js";

import config from "../../../../../config.js";

/**
 * Represents a type of developer tool.
 */
export enum DevTool {
    BlacklistGuild = "blacklist-guild",
    BlacklistUser = "blacklist-user",
    UnblacklistGuild = "unblacklist-guild",
    UnblacklistUser = "unblacklist-user"
}

/**
 * Represents a slash command that provides a set of useful tools for the developers.
 */
export default class extends SlashCommand<DevelopersModule> {
    /**
     * Represents a slash command that provides a set of useful tools for the developers.
     *
     * @param module The module this command belongs to.
     */
    constructor(module: DevelopersModule) {
        super(module, {
            name: "devtools",
            description: "A set of useful tools for the developers of Barry.",
            ownerOnly: true
        });
    }

    /**
     * Executes the 'devtools' slash command.
     *
     * @param interaction The interaction that triggered the command.
     */
    async execute(interaction: ApplicationCommandInteraction): Promise<void> {
        await interaction.createMessage({
            components: [{
                components: [{
                    custom_id: "devtools-select-tool",
                    options: [
                        {
                            label: "Blacklist User",
                            value: DevTool.BlacklistUser
                        },
                        {
                            label: "Blacklist Guild",
                            value: DevTool.BlacklistGuild
                        },
                        {
                            label: "Unblacklist User",
                            value: DevTool.UnblacklistUser
                        },
                        {
                            label: "Unblacklist Guild",
                            value: DevTool.UnblacklistGuild
                        }
                    ],
                    placeholder: "Select a tool",
                    type: ComponentType.StringSelect
                }],
                type: ComponentType.ActionRow
            }],
            content: `### ${config.emotes.add} Select a tool from the dropdown below.`,
            flags: MessageFlags.Ephemeral
        });

        const response = await interaction.awaitMessageComponent({
            customIDs: ["devtools-select-tool"]
        });

        if (!response?.data.isStringSelect()) {
            await interaction.editOriginalMessage(timeoutContent);
            return;
        }

        switch (response.data.values[0]) {
            case DevTool.BlacklistUser: {
                return blacklistUser(this.module, response);
            }
            case DevTool.BlacklistGuild: {
                return blacklistGuild(this.module, response);
            }
            case DevTool.UnblacklistUser: {
                return unblacklistUser(this.module, response);
            }
            case DevTool.UnblacklistGuild: {
                return unblacklistGuild(this.module, response);
            }
        }
    }
}
