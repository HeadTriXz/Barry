import {
    type AnyMessageComponentInteractionData,
    MessageButtonInteractionData,
    MessageChannelSelectInteractionData,
    MessageComponentInteractionData,
    MessageMentionableSelectInteractionData,
    MessageRoleSelectInteractionData,
    MessageStringSelectInteractionData,
    MessageUserSelectInteractionData
} from "../data/index.js";

import { type APIMessageComponentInteractionData, ComponentType } from "@discordjs/core";

/**
 * Factory class for creating message component interaction data instances.
 */
export class MessageComponentInteractionDataFactory {
    /**
     * Creates an instance of the appropriate message component interaction data based on the component type.
     *
     * @param data The raw message component interaction data.
     * @returns The created instance of the message component interaction data.
     */
    static from(data: APIMessageComponentInteractionData): AnyMessageComponentInteractionData {
        switch (data.component_type) {
            case ComponentType.Button: {
                return new MessageButtonInteractionData(data);
            }
            case ComponentType.StringSelect: {
                return new MessageStringSelectInteractionData(data);
            }
            case ComponentType.UserSelect: {
                return new MessageUserSelectInteractionData(data);
            }
            case ComponentType.RoleSelect: {
                return new MessageRoleSelectInteractionData(data);
            }
            case ComponentType.MentionableSelect: {
                return new MessageMentionableSelectInteractionData(data);
            }
            case ComponentType.ChannelSelect: {
                return new MessageChannelSelectInteractionData(data);
            }
            default: {
                return new MessageComponentInteractionData(data) as AnyMessageComponentInteractionData;
            }
        }
    }
}
