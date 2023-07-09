import {
    type APIMessageButtonInteractionData,
    type APIMessageChannelSelectInteractionData,
    type APIMessageMentionableSelectInteractionData,
    type APIMessageRoleSelectInteractionData,
    type APIMessageStringSelectInteractionData,
    type APIMessageUserSelectInteractionData,
    ComponentType
} from "@discordjs/core";

import { mockResolvedData } from "../common.js";

/**
 * Represents the data of a message button interaction.
 */
export const mockMessageButton = {
    component_type: ComponentType.Button,
    custom_id: "button"
} satisfies APIMessageButtonInteractionData;

/**
 * Represents the data of a message channel select interaction.
 */
export const mockMessageChannelSelect = {
    component_type: ComponentType.ChannelSelect,
    custom_id: "select",
    resolved: {
        channels: mockResolvedData.channels
    },
    values: []
} satisfies APIMessageChannelSelectInteractionData;

/**
 * Represents the data of a message mentionable select interaction.
 */
export const mockMessageMentionableSelect = {
    component_type: ComponentType.MentionableSelect,
    custom_id: "select",
    resolved: {
        members: mockResolvedData.members,
        roles: mockResolvedData.roles,
        users: mockResolvedData.users
    },
    values: []
} satisfies APIMessageMentionableSelectInteractionData;

/**
 * Represents the data of a message role select interaction.
 */
export const mockMessageRoleSelect = {
    component_type: ComponentType.RoleSelect,
    custom_id: "select",
    resolved: {
        roles: mockResolvedData.roles
    },
    values: []
} satisfies APIMessageRoleSelectInteractionData;

/**
 * Represents the data of a message string select interaction.
 */
export const mockMessageStringSelect = {
    component_type: ComponentType.StringSelect,
    custom_id: "select",
    values: []
} satisfies APIMessageStringSelectInteractionData;

/**
 * Represents the data of a message user select interaction.
 */
export const mockMessageUserSelect = {
    component_type: ComponentType.UserSelect,
    custom_id: "select",
    resolved: {
        members: mockResolvedData.members,
        users: mockResolvedData.users
    },
    values: []
} satisfies APIMessageUserSelectInteractionData;
