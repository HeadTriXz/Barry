import type {
    APIApplicationCommandInteractionDataOption,
    APIChatInputApplicationCommandInteractionData,
    ApplicationCommandType
} from "@discordjs/core";

import type { InteractionResolvedData } from "../../Interaction.js";
import { ApplicationCommandInteractionData } from "./ApplicationCommandInteractionData.js";

/**
 * Represents the data of an application command interaction with type "CHAT_INPUT".
 */
export class ChatInputApplicationCommandInteractionData extends ApplicationCommandInteractionData {
    /**
     * Parameters for the invoked application command.
     */
    options?: APIApplicationCommandInteractionDataOption[];

    /**
     * Resolved data for the invoked application command.
     */
    resolved: InteractionResolvedData;

    /**
     * The type of application command.
     */
    declare type: ApplicationCommandType.ChatInput;

    /**
     * Represents the data of an application command interaction with type "CHAT_INPUT".
     *
     * @param data The raw data of the interaction.
     */
    constructor(data: APIChatInputApplicationCommandInteractionData) {
        super(data);

        this.options = data.options;
        this.resolved = {
            attachments: new Map(),
            channels: new Map(),
            members: new Map(),
            roles: new Map(),
            users: new Map()
        };

        if (data.resolved?.attachments !== undefined) {
            for (const id in data.resolved.attachments) {
                this.resolved.attachments.set(id, data.resolved.attachments[id]);
            }
        }

        if (data.resolved?.channels !== undefined) {
            for (const id in data.resolved.channels) {
                this.resolved.channels.set(id, data.resolved.channels[id]);
            }
        }

        if (data.resolved?.members !== undefined) {
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

        if (data.resolved?.roles !== undefined) {
            for (const id in data.resolved.roles) {
                this.resolved.roles.set(id, data.resolved.roles[id]);
            }
        }

        if (data.resolved?.users !== undefined) {
            for (const id in data.resolved.users) {
                this.resolved.users.set(id, data.resolved.users[id]);
            }
        }
    }
}
