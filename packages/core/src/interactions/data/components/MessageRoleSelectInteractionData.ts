import type { APIMessageRoleSelectInteractionData, ComponentType } from "@discordjs/core";
import type { InteractionResolvedData } from "../../Interaction.js";

import { MessageComponentInteractionData } from "./MessageComponentInteractionData.js";

/**
 * Represents the data of a message component interaction with type "ROLE_SELECT".
 */
export class MessageRoleSelectInteractionData extends MessageComponentInteractionData {
    /**
     * The type of component.
     */
    declare componentType: ComponentType.RoleSelect;

    /**
     * Resolved data for the role select menu.
     */
    resolved: Pick<InteractionResolvedData, "roles">;

    /**
     * The IDs of the selected roles.
     */
    values: string[];

    /**
     * Represents the data of a message component interaction with type "ROLE_SELECT".
     *
     * @param data The raw data of the interaction.
     */
    constructor(data: APIMessageRoleSelectInteractionData) {
        super(data);

        this.resolved = {
            roles: new Map()
        };

        for (const id in data.resolved.roles) {
            this.resolved.roles.set(id, data.resolved.roles[id]);
        }

        this.values = data.values;
    }
}
