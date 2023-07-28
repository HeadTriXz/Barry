import type { APIMessageMentionableSelectInteractionData, ComponentType } from "@discordjs/core";
import type { InteractionResolvedData } from "../../Interaction.js";

import { MessageComponentInteractionData } from "./MessageComponentInteractionData.js";

/**
 * Represents the data of a message component interaction with type "MENTIONABLE_SELECT".
 */
export class MessageMentionableSelectInteractionData extends MessageComponentInteractionData {
    /**
     * The type of component.
     */
    declare componentType: ComponentType.MentionableSelect;

    /**
     * Resolved data for the mentionable select menu.
     */
    resolved: Pick<InteractionResolvedData, "members" | "roles" | "users">;

    /**
     * The IDs of the selected users and roles.
     */
    values: string[];

    /**
     * Represents the data of a message component interaction with type "MENTIONABLE_SELECT".
     *
     * @param data The raw data of the interaction.
     */
    constructor(data: APIMessageMentionableSelectInteractionData) {
        super(data);

        this.resolved = {
            members: new Map(),
            roles: new Map(),
            users: new Map()
        };

        if (data.resolved.members !== undefined) {
            if (data.resolved.users === undefined) {
                throw new Error("Resolved user data is missing while processing members.");
            }

            for (const id in data.resolved.members) {
                this.resolved.members.set(id, {
                    ...data.resolved.members[id],
                    user: data.resolved.users[id]
                });
            }
        }

        if (data.resolved.roles !== undefined) {
            for (const id in data.resolved.roles) {
                this.resolved.roles.set(id, data.resolved.roles[id]);
            }
        }

        if (data.resolved.users !== undefined) {
            for (const id in data.resolved.users) {
                this.resolved.users.set(id, data.resolved.users[id]);
            }
        }

        this.values = data.values;
    }
}
