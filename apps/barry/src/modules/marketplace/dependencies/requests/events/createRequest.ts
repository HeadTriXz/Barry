import { type AnyInteraction, Event } from "@barry/core";
import type RequestsModule from "../index.js";

import {
    ButtonStyle,
    ComponentType,
    GatewayDispatchEvents,
    MessageFlags
} from "@discordjs/core";
import { ManageRequestButton } from "../index.js";
import { RequestEditor } from "../editor/RequestEditor.js";
import { timeoutContent } from "../../../constants.js";
import config from "../../../../../config.js";

/**
 * Represents an event handler for creating a request.
 */
export default class extends Event<RequestsModule> {
    /**
     * Represents an event handler for creating a request.
     *
     * @param module The module the event belongs to.
     */
    constructor(module: RequestsModule) {
        super(module, GatewayDispatchEvents.InteractionCreate);
    }

    /**
     * Handles the interaction triggered by the 'Create Request' button.
     *
     * @param interaction The interaction that triggered the button.
     */
    async execute(interaction: AnyInteraction): Promise<void> {
        const isValidInteraction = interaction.isInvokedInGuild()
            && interaction.isMessageComponent()
            && interaction.data.isButton()
            && interaction.data.customID === ManageRequestButton.Create;

        if (!isValidInteraction) {
            return;
        }

        const settings = await this.module.requestsSettings.getOrCreate(interaction.guildID);
        if (!settings.enabled) {
            return interaction.editParent({
                content: `${config.emotes.error} Requests are currently disabled for this guild.`
            });
        }

        if (settings.channelID === null) {
            return interaction.editParent({
                content: `${config.emotes.error} This guild hasn't setup their channel for requests.`
            });
        }

        const draft = await this.module.requests.getDraft(interaction.user.id);
        const editor = new RequestEditor(this.module, settings, false);

        if (draft === null) {
            return editor.next(interaction);
        }

        await interaction.editParent({
            components: [{
                components: [
                    {
                        custom_id: "continue",
                        label: "Continue Draft",
                        style: ButtonStyle.Success,
                        type: ComponentType.Button
                    },
                    {
                        custom_id: "discard",
                        label: "Discard Draft",
                        style: ButtonStyle.Danger,
                        type: ComponentType.Button
                    },
                    {
                        custom_id: "nevermind",
                        label: "Nevermind",
                        style: ButtonStyle.Secondary,
                        type: ComponentType.Button
                    }
                ],
                type: ComponentType.ActionRow
            }],
            content: `${config.emotes.error} You already have a draft request.`,
            flags: MessageFlags.Ephemeral
        });

        const response = await interaction.awaitMessageComponent({
            customIDs: ["continue", "discard", "nevermind"]
        });

        if (response === undefined) {
            return interaction.editParent(timeoutContent);
        }

        if (response.data.customID === "continue") {
            editor.request = draft;

            return editor.next(response);
        }

        if (response.data.customID === "discard") {
            await this.module.requests.delete(draft.id);

            return editor.next(response);
        }

        if (response.data.customID === "nevermind") {
            return response.editParent({
                components: [],
                content: `${config.emotes.check} Okay! I'll keep the draft until you're ready.`,
                flags: MessageFlags.Ephemeral
            });
        }
    }
}
