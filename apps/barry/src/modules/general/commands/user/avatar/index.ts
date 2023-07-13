import {
    type ApplicationCommandInteraction,
    type UserCommandTarget,
    UserCommand,
    getDefaultAvatarURL
} from "@barry/core";

import type GeneralModule from "../../../index.js";
import config from "../../../../../config.js";

/**
 * Represents a user command that retrieves the user's avatar.
 */
export default class extends UserCommand<GeneralModule> {
    /**
     * Represents a user command that retrieves the user's avatar.
     *
     * @param module The module the command belongs to.
     */
    constructor(module: GeneralModule) {
        super(module, {
            name: "View Avatar"
        });
    }

    /**
     * Execute the "View Avatar" command.
     *
     * @param interaction The interaction that triggered the command.
     * @param target The resolved data provided with the command.
     */
    async execute(interaction: ApplicationCommandInteraction, { user }: UserCommandTarget): Promise<void> {
        await interaction.createMessage({
            embeds: [{
                image: {
                    url: user.avatar !== null
                        ? this.client.api.rest.cdn.avatar(user.id, user.avatar, { size: 1024 })
                        : getDefaultAvatarURL(user)
                },
                color: config.defaultColor
            }]
        });
    }
}
