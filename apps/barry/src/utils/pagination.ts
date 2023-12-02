import {
    type APIActionRowComponent,
    type APIButtonComponentWithCustomId,
    ButtonStyle,
    ComponentType,
    MessageFlags
} from "@discordjs/core";
import type {
    APIInteractionResponseCallbackDataWithFiles,
    Awaitable,
    ReplyableInteraction
} from "@barry-bot/core";

import config from "../config.js";

/**
 * Represents a cache for pagination.
 */
type PaginationCache = Record<number, Awaitable<APIInteractionResponseCallbackDataWithFiles>>;

/**
 * Represents the options for the pagination.
 */
export type AnyPaginationOptions<T = unknown> = IndexBasedPaginationOptions | ValueBasedPaginationOptions<T>;

/**
 * Represents a function that generates the content for a specific page.
 */
export type IndexBasedPaginationContent = (index: number) => Awaitable<APIInteractionResponseCallbackDataWithFiles>;

/**
 * Represents a function that generates the content for a specific page.
 */
export type ValueBasedPaginationContent<T> = (values: T[], index: number) =>
    Awaitable<APIInteractionResponseCallbackDataWithFiles>;

/**
 * Represents the base options for the pagination.
 */
export interface BasePaginationOptions {
    /**
     * A function for customizing the pagination buttons.
     */
    buttons?: (previous: APIButtonComponentWithCustomId, next: APIButtonComponentWithCustomId) =>
        APIButtonComponentWithCustomId[];

    /**
     * Optional flags for deferring the interaction.
     */
    flags?: MessageFlags;

    /**
     * The interaction to reply to.
     */
    interaction: ReplyableInteraction;

    /**
     * A function that is called when the pagination is refreshed.
     */
    onRefresh?: (interaction: ReplyableInteraction) => Awaitable<void>;

    /**
     * The amount of items to show per page.
     */
    pageSize: number;

    /**
     * The amount of pages to load in the background.
     */
    preLoadPages?: number;

    /**
     * The timeout duration in milliseconds (default: 10 minutes).
     */
    timeout?: number;
}

/**
 * Represents the options for index-based pagination.
 */
export interface IndexBasedPaginationOptions extends BasePaginationOptions {
    /**
     * A function that generates the content for a specific page.
     */
    content: IndexBasedPaginationContent;

    /**
     * The amount of items to paginate.
     */
    count: number;

    /**
     * An array of items to paginate.
     */
    values?: never;
}

/**
 * Represents the options for value-based pagination.
 */
export interface ValueBasedPaginationOptions<T> extends BasePaginationOptions {
    /**
     * A function that generates the content for a specific page.
     */
    content: ValueBasedPaginationContent<T>;

    /**
     * The amount of items to paginate.
     */
    count?: never;

    /**
     * An array of items to paginate.
     */
    values: T[];
}

/**
 * Represents a paginated message.
 */
export class PaginationMessage<T = unknown> {
    /**
     * The cache used to store paginated pages.
     */
    #cache: PaginationCache = {};

    /**
     * The index of the current page.
     */
    #index: number = 0;

    /**
     * The options for pagination.
     */
    #options: AnyPaginationOptions<T>;

    /**
     * Represents a paginated message.
     *
     * @param options The options for pagination.
     */
    constructor(options: AnyPaginationOptions<T>) {
        this.#options = options;
    }

    /**
     * The total amount of items to paginate.
     */
    get count(): number {
        return this.#options.values !== undefined
            ? this.#options.values.length
            : this.#options.count;
    }

    /**
     * Creates the initial paginated message.
     *
     * @param options The options for pagination.
     * @returns The new pagination message.
     */
    static async create<T>(options: AnyPaginationOptions<T>): Promise<PaginationMessage<T>> {
        const message = new PaginationMessage(options);
        await message.create();

        return message;
    }

    /**
     * Clears the cache of the paginated message.
     */
    clearCache(): void {
        this.#cache = {};
    }

    /**
     * Creates the initial paginated message.
     */
    async create(): Promise<void> {
        if (!this.#options.interaction.acknowledged) {
            await this.#options.interaction.defer({ flags: this.#options.flags });
        }

        await this.#handleNavigationUpdate();
    }

    /**
     * Pre-loads pages in the background to improve navigation speed.
     */
    async preLoadPages(): Promise<void> {
        if (this.#options.preLoadPages === undefined) {
            return;
        }

        const promises = [];
        for (let i = 1; i <= this.#options.preLoadPages; i++) {
            const nextIndex = this.#index + i;
            if (nextIndex * this.#options.pageSize >= this.count) {
                break;
            }

            const promise = this.#getPageContent(nextIndex)
                .then((content) => this.#cache[nextIndex] = content);

            this.#cache[nextIndex] = promise;
            promises.push(promise);
        }

        await Promise.all(promises);
    }

    /**
     * Refreshes the paginated message by updating the content.
     */
    async refresh(): Promise<void> {
        if (this.#options.onRefresh !== undefined) {
            await this.#options.onRefresh(this.#options.interaction);
        }

        const content = await this.#getPageContent();
        await this.#options.interaction.editOriginalMessage(content);
    }

    /**
     * Sets the index of the current page.
     *
     * @param index The new index.
     */
    setIndex(index: number): void {
        this.#index = index;
    }

    /**
     * Waits for user interactions to navigate between pages.
     */
    async #awaitNavigationUpdate(): Promise<void> {
        const response = await this.#options.interaction.awaitMessageComponent({
            customIDs: ["previous", "next"],
            timeout: this.#options.timeout,
            userID: null
        });

        if (response !== undefined) {
            if (response.user.id !== this.#options.interaction.user.id) {
                await response.createMessage({
                    content: `${config.emotes.error} You cannot interact with this message as it was not initiated by you. Please create your own using the appropriate command.`,
                    flags: MessageFlags.Ephemeral
                });

                return this.#awaitNavigationUpdate();
            }

            if (this.#options.preLoadPages !== undefined && this.#options.preLoadPages > 0) {
                const key = response.data.customID === "next"
                    ? this.#index - this.#options.preLoadPages
                    : this.#index + this.#options.preLoadPages;

                delete this.#cache[key];
            }

            this.#index += response.data.customID === "next" ? 1 : -1;
            this.#options.interaction = response;

            await response.deferUpdate();
            await this.#handleNavigationUpdate();
        } else {
            await this.#options.interaction.editOriginalMessage({ components: [] });
        }
    }

    /**
     * Gets the button components for a specified page.
     *
     * @param index The index of the selected page.
     * @param lastIndex The index of the last page.
     * @returns An array containing an action row with the buttons.
     */
    #getComponents(index: number, lastIndex: number): Array<APIActionRowComponent<APIButtonComponentWithCustomId>> {
        const next: APIButtonComponentWithCustomId = {
            custom_id: "next",
            disabled: index >= lastIndex,
            emoji: {
                id: config.emotes.next.id,
                name: config.emotes.next.name
            },
            label: "Next Page",
            style: ButtonStyle.Secondary,
            type: ComponentType.Button
        };

        const previous: APIButtonComponentWithCustomId = {
            custom_id: "previous",
            disabled: index <= 0,
            emoji: {
                id: config.emotes.previous.id,
                name: config.emotes.previous.name
            },
            label: "Previous Page",
            style: ButtonStyle.Secondary,
            type: ComponentType.Button
        };

        return [{
            components: this.#options.buttons !== undefined
                ? this.#options.buttons(previous, next)
                : [previous, next],
            type: ComponentType.ActionRow
        }];
    }

    /**
     * Gets a chunk of values for a specified page.
     *
     * @param values The values to get a chunk of.
     * @param index The index of the selected page.
     * @returns The chunk of values.
     */
    #getPageChunk(values: T[], index: number): T[] {
        const startIndex = index * this.#options.pageSize;
        const endIndex = startIndex + this.#options.pageSize;

        return values.slice(startIndex, endIndex);
    }

    /**
     * Gets the content for a specific page in the pagination.
     *
     * @param index The index of the selected page.
     * @returns The content for the page.
     */
    async #getPageContent(index: number = this.#index): Promise<APIInteractionResponseCallbackDataWithFiles> {
        if (this.#cache[index] !== undefined) {
            return this.#cache[index];
        }

        const lastPage = Math.ceil(this.count / this.#options.pageSize);
        const content = this.#options.values !== undefined
            ? await this.#options.content(this.#getPageChunk(this.#options.values, index), index)
            : await this.#options.content(index);

        content.content ??= "";
        if (this.count > this.#options.pageSize) {
            const components = this.#getComponents(index, lastPage - 1);

            if (content.components !== undefined) {
                content.components.push(...components);
            } else {
                content.components = components;
            }
        }

        if (this.#options.preLoadPages !== undefined && this.#options.preLoadPages > 0) {
            this.#cache[index] = content;
        }

        return content;
    }

    /**
     * Handles the navigation of the pagination.
     */
    async #handleNavigationUpdate(): Promise<void> {
        await this.refresh();

        if (this.count > this.#options.pageSize) {
            if (this.#options.preLoadPages !== undefined && this.#options.preLoadPages > 0) {
                this.preLoadPages();
            }

            await this.#awaitNavigationUpdate();
        }
    }
}
