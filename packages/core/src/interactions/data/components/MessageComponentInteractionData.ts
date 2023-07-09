import { type APIMessageComponentInteractionData, ComponentType } from "@discordjs/core";

import type { MessageButtonInteractionData } from "./MessageButtonInteractionData.js";
import type { MessageChannelSelectInteractionData } from "./MessageChannelSelectInteractionData.js";
import type { MessageMentionableSelectInteractionData } from "./MessageMentionableSelectInteractionData.js";
import type { MessageRoleSelectInteractionData } from "./MessageRoleSelectInteractionData.js";
import type { MessageStringSelectInteractionData } from "./MessageStringSelectInteractionData.js";
import type { MessageUserSelectInteractionData } from "./MessageUserSelectInteractionData.js";

/**
 * Represents the data of a message component interaction.
 */
export type AnyMessageComponentInteractionData = MessageButtonInteractionData
    | MessageChannelSelectInteractionData
    | MessageMentionableSelectInteractionData
    | MessageRoleSelectInteractionData
    | MessageStringSelectInteractionData
    | MessageUserSelectInteractionData;

/**
 * Represents the data of a message component interaction.
 */
export class MessageComponentInteractionData {
    /**
     * The type of message component.
     */
    componentType: ComponentType;

    /**
     * The ID of the message component.
     */
    customID: string;

    /**
     * Represents the data of a message component interaction.
     *
     * @param data The raw data of the interaction.
     */
    constructor(data: APIMessageComponentInteractionData) {
        this.componentType = data.component_type;
        this.customID = data.custom_id;
    }

    /**
     * Checks if this component is a button.
     *
     * @returns Whether this component is a button.
     */
    isButton(): this is MessageButtonInteractionData {
        return this.componentType === ComponentType.Button;
    }

    /**
     * Checks if this component is a channel select menu.
     *
     * @returns Whether this component is a channel select menu.
     */
    isChannelSelect(): this is MessageChannelSelectInteractionData {
        return this.componentType === ComponentType.ChannelSelect;
    }

    /**
     * Checks if this component is a mentionable select menu.
     *
     * @returns Whether this component is a mentionable select menu.
     */
    isMentionableSelect(): this is MessageMentionableSelectInteractionData {
        return this.componentType === ComponentType.MentionableSelect;
    }

    /**
     * Checks if this component is a role select menu.
     *
     * @returns Whether this component is a role select menu.
     */
    isRoleSelect(): this is MessageRoleSelectInteractionData {
        return this.componentType === ComponentType.RoleSelect;
    }

    /**
     * Checks if this component is a string select menu.
     *
     * @returns Whether this component is a string select menu.
     */
    isStringSelect(): this is MessageStringSelectInteractionData {
        return this.componentType === ComponentType.StringSelect;
    }

    /**
     * Checks if this component is a user select menu.
     *
     * @returns Whether this component is a user select menu.
     */
    isUserSelect(): this is MessageUserSelectInteractionData {
        return this.componentType === ComponentType.UserSelect;
    }
}
