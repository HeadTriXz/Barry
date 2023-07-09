import type { APIMessageUserSelectInteractionData, ComponentType } from "@discordjs/core";
import type { InteractionResolvedData } from "../../Interaction.js";

import { MessageComponentInteractionData } from "./MessageComponentInteractionData.js";

/**
 * Represents the data of a message component interaction with type "USER_SELECT".
 */
export class MessageUserSelectInteractionData extends MessageComponentInteractionData {
    /**
     * The type of component.
     */
    declare componentType: ComponentType.UserSelect;

    /**
     * Resolved data for the user select menu.
     */
    resolved: Pick<InteractionResolvedData, "members" | "users">;

    /**
     * The IDs of the selected users.
     */
    values: string[];

    /**
     * Represents the data of a message component interaction with type "USER_SELECT".
     *
     * @param data The raw data of the interaction.
     */
    constructor(data: APIMessageUserSelectInteractionData) {
        super(data);

        this.resolved = {
            members: new Map(),
            users: new Map()
        };

        if (data.resolved?.members !== undefined) {
            for (const id in data.resolved.members) {
                this.resolved.members.set(id, data.resolved.members[id]);
            }
        }

        if (data.resolved?.users !== undefined) {
            for (const id in data.resolved.users) {
                this.resolved.users.set(id, data.resolved.users[id]);
            }
        }

        this.values = data.values;
    }
}
