import {
    type ApplicationCommandInteraction,
    type UserCommandTarget,
    UserCommand
} from "@barry-bot/core";

import type GeneralModule from "../../../index.js";

import { MessageFlags } from "@discordjs/core";
import { getReverseAvatarContent } from "../../../functions/reverse/getReverseContent.js";

import config from "../../../../../config.js";

/**
 * Represents a user command for reverse searching a user's avatar.
 */
export default class extends UserCommand<GeneralModule> {
    /**
     * Represents a user command for reverse searching a user's avatar.
     *
     * @param module The module this command belongs to.
     */
    constructor(module: GeneralModule) {
        super(module, {
            name: "Reverse Search Avatar"
        });
    }

    /**
     * Executes the "Reverse Search Avatar" command.
     *
     * @param interaction The interaction that triggered the command.
     * @param target The resolved data provided with the command.
     */
    async execute(interaction: ApplicationCommandInteraction, { user }: UserCommandTarget): Promise<void> {
        if (user.avatar === null) {
            return interaction.createMessage({
                content: `${config.emotes.error} This user does not have an avatar.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const avatarURL = this.client.api.rest.cdn.avatar(user.id, user.avatar, { size: 1024 });
        await interaction.createMessage(getReverseAvatarContent(avatarURL));
    }
}
