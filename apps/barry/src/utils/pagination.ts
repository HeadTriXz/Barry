import type { Awaitable, ReplyableInteraction } from "@barry/core";
import {
    type APIActionRowComponent,
    type APIButtonComponentWithCustomId,
    type APIInteractionResponseCallbackData,
    type MessageFlags,
    ButtonStyle,
    ComponentType
} from "@discordjs/core";

import config from "../config.js";

/**
 * Represents a function that generates the content for a specific page.
 */
export type PaginationContent<T> = (values: T[], index: number) => Awaitable<APIInteractionResponseCallbackData>;

/**
 * Represents the options for customizing the pagination buttons.
 */
export interface ButtonOptions {
    /**
     * Partial override for the 'Next Page' button.
     */
    next?: Partial<APIButtonComponentWithCustomId>;

    /**
     * Partial override for the 'Previous Page' button.
     */
    previous?: Partial<APIButtonComponentWithCustomId>;
}

/**
 * Represents the options for the pagination.
 */
export interface PaginationOptions<T> {
    /**
     * The options for customizing the pagination buttons.
     */
    buttons?: ButtonOptions;

    /**
     * A function that generates the content for a specific page.
     */
    content: PaginationContent<T>;

    /**
     * Optional flags for deferring the interaction.
     */
    flags?: MessageFlags;

    /**
     * The interaction to reply to.
     */
    interaction: ReplyableInteraction;

    /**
     * The amount of items to show per page.
     */
    pageSize: number;

    /**
     * The timeout duration in milliseconds (default: 10 minutes).
     */
    timeout?: number;

    /**
     * An array of items to paginate.
     */
    values: T[];
}

/**
 * Returns the button components for the pagination.
 *
 * @param index The index of the selected page.
 * @param lastIndex The index of the last page.
 * @param options Optional options for the buttons.
 */
const getComponents = (
    index: number,
    lastIndex: number,
    options: ButtonOptions = {}
): Array<APIActionRowComponent<APIButtonComponentWithCustomId>> => [{
    components: [
        {
            custom_id: "previous",
            disabled: index <= 0,
            emoji: {
                id: config.emotes.previous.id,
                name: config.emotes.previous.name
            },
            label: "Previous Page",
            style: ButtonStyle.Secondary,
            type: ComponentType.Button,
            ...options.previous
        },
        {
            custom_id: "next",
            disabled: index >= lastIndex,
            emoji: {
                id: config.emotes.next.id,
                name: config.emotes.next.name
            },
            label: "Next Page",
            style: ButtonStyle.Secondary,
            type: ComponentType.Button,
            ...options.next
        }
    ],
    type: ComponentType.ActionRow
}];

/**
 * Returns the content for a specific page in the pagination.
 *
 * @param index The index of the selected page.
 * @param options Options for the pagination.
 */
async function getPageContent<T>(
    index: number,
    options: PaginationOptions<T>
): Promise<APIInteractionResponseCallbackData> {
    const chunk = options.values.slice(index * options.pageSize, (index + 1) * options.pageSize);
    const lastPage = Math.ceil(options.values.length / options.pageSize);

    const content = await options.content(chunk, index);
    if (options.values.length > options.pageSize) {
        const components = getComponents(index, lastPage - 1, options.buttons);

        if (content.components !== undefined) {
            content.components.push(...components);
        } else {
            content.components = components;
        }
    }

    return content;
}

/**
 * Listens for navigation updates.
 *
 * @param messageID The ID of the message to listen on.
 * @param index The index of the selected page.
 * @param options Options for the pagination.
 */
async function awaitNavigationUpdate<T>(
    messageID: string,
    index: number,
    options: PaginationOptions<T>
): Promise<void> {
    const response = await options.interaction.awaitMessageComponent(messageID, ["previous", "next"], options.timeout);
    if (response !== undefined) {
        index += response.data.customID === "next" ? 1 : -1;
        options.interaction = response;

        await response.deferUpdate();
        await handleNavigationUpdate(index, options);
    } else {
        await options.interaction.editOriginalMessage({ components: [] });
    }
}

/**
 * Handles the navigation of the pagination.
 *
 * @param index The index of the selected page.
 * @param options Options for the pagination.
 */
async function handleNavigationUpdate<T>(
    index: number,
    options: PaginationOptions<T>
): Promise<void> {
    const content = await getPageContent(index, options);
    const message = await options.interaction.editOriginalMessage(content);

    if (options.values.length > options.pageSize) {
        await awaitNavigationUpdate(message.id, index, options);
    }
}

/**
 * Creates a paginated message.
 *
 * @param options Options for the pagination.
 */
export async function createPaginatedMessage<T>(options: PaginationOptions<T>): Promise<void> {
    options.timeout ??= 600000;

    await options.interaction.defer({ flags: options.flags });
    await handleNavigationUpdate(0, options);
}
