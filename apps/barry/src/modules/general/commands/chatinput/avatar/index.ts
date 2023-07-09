import {
    type ApplicationCommandInteraction,
    SlashCommand,
    SlashCommandOptionBuilder,
    getDefaultAvatarURL
} from "@barry/core";

import type { APIUser } from "@discordjs/core";
import type GeneralModule from "../../../index.js";

import config from "../../../../../config.js";

/**
 * Represents a "avatar" slash command.
 */
export default class extends SlashCommand<GeneralModule> {
    /**
     * Represents a "avatar" slash command.
     *
     * @param module The module the command belongs to.
     */
    constructor(module: GeneralModule) {
        super(module, {
            name: "avatar",
            description: "Shows the avatar of a user.",
            options: {
                user: SlashCommandOptionBuilder.user({
                    description: "The user to get the avatar of."
                })
            }
        });
    }

    /**
     * Execute the "avatar" command.
     *
     * @param interaction The interaction that triggered the command.
     */
    async execute(interaction: ApplicationCommandInteraction, options: { user?: APIUser }): Promise<void> {
        const target = options.user ?? interaction.user;
        await interaction.createMessage({
            embeds: [{
                image: {
                    url: target.avatar !== null
                        ? this.client.api.rest.cdn.avatar(target.id, target.avatar, { size: 1024 })
                        : getDefaultAvatarURL(target)
                },
                color: config.defaultColor
            }]
        });
    }
}
