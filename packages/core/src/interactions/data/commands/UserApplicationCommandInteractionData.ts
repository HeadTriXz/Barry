import type { APIUserApplicationCommandInteractionData, ApplicationCommandType } from "@discordjs/core";
import type { InteractionResolvedData } from "../../Interaction.js";
import { ApplicationCommandInteractionData } from "./ApplicationCommandInteractionData.js";

/**
 * Represents the data of an application command interaction with type "USER".
 */
export class UserApplicationCommandInteractionData extends ApplicationCommandInteractionData {
    /**
     * Resolved data for the user command.
     */
    resolved: Pick<InteractionResolvedData, "members" | "users">;

    /**
     * The ID of the user targeted by the user command.
     */
    targetID: string;

    /**
     * The type of application command.
     */
    declare type: ApplicationCommandType.User;

    /**
     * Represents the data of an application command interaction with type "USER".
     *
     * @param data The raw data of the interaction.
     */
    constructor(data: APIUserApplicationCommandInteractionData) {
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

        this.targetID = data.target_id;
    }
}
