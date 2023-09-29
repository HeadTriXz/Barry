import type {
    BanFunction,
    BaseModerationActions,
    DWCFunction,
    KickFunction,
    MuteFunction,
    WarnFunction
} from "../../../../types/moderation.js";
import { type ReplyableInteraction, UpdatableInteraction } from "@barry/core";
import type ModerationModule from "../../index.js";

import { MessageFlags } from "@discordjs/core";
import { ban } from "./ban.js";
import { dwc } from "./dwc.js";
import { kick } from "./kick.js";
import { mute } from "./mute.js";
import { warn } from "./warn.js";

/**
 * Responds to an interaction.
 *
 * @param interaction The interaction to respond to.
 * @param content The content of the message.
 */
export async function respond(interaction: ReplyableInteraction, content: string): Promise<void> {
    if (interaction instanceof UpdatableInteraction) {
        return interaction.editParent({ content });
    }

    await interaction.createMessage({
        content: content,
        flags: MessageFlags.Ephemeral
    });
}


/**
 * Represents actions that can be performed on a user.
 */
export class ModerationActions implements BaseModerationActions {
    /**
     * Bans a user from the guild.
     *
     * @param interaction The interaction that triggered the command.
     * @param options The options for the ban.
     */
    ban: BanFunction;

    /**
     * Marks a user as 'Deal With Caution'.
     *
     * @param interaction The interaction that triggered the command.
     * @param options The options for the command.
     */
    dwc: DWCFunction;

    /**
     * Kicks a user from the guild.
     *
     * @param interaction The interaction that triggered the command.
     * @param options The options for the kick.
     */
    kick: KickFunction;

    /**
     * Times out a user in the guild.
     *
     * @param interaction The interaction that triggered the command.
     * @param options The options for the mute.
     */
    mute: MuteFunction;

    /**
     * Warns a user in the guild.
     *
     * @param interaction The interaction that triggered the command.
     * @param options The options for the warn.
     */
    warn: WarnFunction;

    /**
     * Represents actions that can be performed on a user.
     *
     * @param module The moderation module.
     */
    constructor(module: ModerationModule) {
        this.ban = ban.bind(null, module);
        this.dwc = dwc.bind(null, module);
        this.kick = kick.bind(null, module);
        this.mute = mute.bind(null, module);
        this.warn = warn.bind(null, module);
    }
}
