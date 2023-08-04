import {
    type APIButtonComponentWithCustomId,
    ButtonStyle,
    ComponentType,
    MessageFlags,
    TextInputStyle
} from "@discordjs/core";
import {
    type APIInteractionResponseCallbackDataWithFiles,
    type ApplicationCommandInteraction,
    type ReplyableInteraction,
    SlashCommand
} from "@barry/core";
import type LevelingModule from "../../../index.js";

import { MemberActivitySortBy, MemberActivitySortOrder } from "../../../database.js";

import { PAGE_SIZE } from "./constants.js";
import { LeaderboardCanvas } from "./LeaderboardCanvas.js";
import { PaginationMessage } from "../../../../../utils/pagination.js";
import { join } from "node:path";
import { loadFont } from "canvas-constructor/napi-rs";

import config from "../../../../../config.js";

loadFont(join(process.cwd(), "./fonts/Inter-SemiBold.ttf"), "Inter SemiBold");
loadFont(join(process.cwd(), "./fonts/Inter-Regular.ttf"), "Inter");

/**
 * Represents sort options for the leaderboard.
 */
interface SortOptions {
    /**
     * The field by which to sort the leaderboard.
     */
    by: MemberActivitySortBy;

    /**
     * The order in which the leaderboard is sorted.
     */
    order: MemberActivitySortOrder;
}

/**
 * Represents the available options for the leaderboard menu.
 */
export enum LeaderboardMenuOption {
    GoToPage = "go_to_page",
    SortBy = "sort_by",
    SortOrder = "sort_order"
}

/**
 * Represents a slash command that shows a leaderboard of the most active members.
 */
export default class extends SlashCommand<LevelingModule> {
    /**
     * Represents a slash command that shows a leaderboard of the most active members.
     *
     * @param module The module this command belongs to.
     */
    constructor(module: LevelingModule) {
        super(module, {
            name: "leaderboard",
            description: "View the most active members of this server.",
            guildOnly: true
        });
    }

    /**
     * Executes the "leaderboard" command.
     *
     * @param interaction The interaction that triggered the command.
     */
    async execute(interaction: ApplicationCommandInteraction): Promise<void> {
        if (!interaction.isInvokedInGuild()) {
            return;
        }

        await interaction.defer();

        const count = await this.module.memberActivity.count(interaction.guildID);
        const sortOptions: SortOptions = {
            by: MemberActivitySortBy.Experience,
            order: MemberActivitySortOrder.Descending
        };

        const message = new PaginationMessage({
            buttons: (previous, next) => this.#getButtons(previous, next),
            content: (index) => this.#getPageContent(interaction.guildID, index, sortOptions),
            count: count,
            interaction: interaction,
            pageSize: PAGE_SIZE,
            preLoadPages: 1,
            showLoading: true
        });

        await Promise.all([
            message.create(),
            this.#awaitMenuButton(interaction, message, sortOptions)
        ]);
    }

    /**
     * Waits for the user to interact with the menu button.
     *
     * @param interaction The interaction that triggered the command.
     * @param message The pagination message to listen on.
     * @param sortOptions The sort options.
     */
    async #awaitMenuButton(
        interaction: ReplyableInteraction,
        message: PaginationMessage,
        sortOptions: SortOptions
    ): Promise<void> {
        const response = await interaction.awaitMessageComponent({
            customIDs: ["menu"],
            userID: null
        });

        if (response === undefined) {
            return;
        }

        if (response.user.id !== interaction.user.id) {
            await response.createMessage({
                content: `${config.emotes.error} You cannot interact with this message as it was not initiated by you. Please create your own using the appropriate command.`,
                flags: MessageFlags.Ephemeral
            });

            return this.#awaitMenuButton(interaction, message, sortOptions);
        }

        await response.createMessage(this.#getMenuContent(sortOptions));
        await Promise.all([
            this.#awaitMenuSelect(response, message, sortOptions),
            this.#awaitMenuButton(interaction, message, sortOptions)
        ]);
    }

    /**
     * Waits for the user to select an option in the menu.
     *
     * @param interaction The interaction that opened the menu.
     * @param message The pagination message the menu belong to.
     * @param sortOptions The sort options.
     */
    async #awaitMenuSelect(
        interaction: ReplyableInteraction,
        message: PaginationMessage,
        sortOptions: SortOptions
    ): Promise<void> {
        const response = await interaction.awaitMessageComponent({
            customIDs: ["menu_option"]
        });

        if (response === undefined || !response.data.isStringSelect()) {
            return;
        }

        switch (response.data.values[0]) {
            case LeaderboardMenuOption.GoToPage: {
                const page = await this.#awaitNewPage(response, message);
                if (page === undefined) {
                    return;
                }

                message.setIndex(page - 1);
                break;
            }
            case LeaderboardMenuOption.SortBy: {
                sortOptions.by = sortOptions.by === MemberActivitySortBy.Experience
                    ? MemberActivitySortBy.Reputation
                    : MemberActivitySortBy.Experience;

                break;
            }
            case LeaderboardMenuOption.SortOrder: {
                sortOptions.order = sortOptions.order === MemberActivitySortOrder.Ascending
                    ? MemberActivitySortOrder.Descending
                    : MemberActivitySortOrder.Ascending;

                break;
            }
        }

        await response.editParent(this.#getMenuContent(sortOptions));

        message.clearCache();
        await message.refresh();

        await this.#awaitMenuSelect(response, message, sortOptions);
    }

    /**
     * Waits for the user to input a new page number.
     *
     * @param interaction The interaction of the user selecting an option.
     * @param message The pagination message to change the page of.
     * @returns The selected page number, or undefined if invalid.
     */
    async #awaitNewPage(interaction: ReplyableInteraction, message: PaginationMessage): Promise<number | undefined> {
        const lastPage = Math.ceil(message.count / PAGE_SIZE);
        const key = `${Date.now()}_go_to_page`;

        await interaction.createModal({
            components: [{
                components: [{
                    custom_id: "page",
                    label: "Page",
                    placeholder: `What page would you like to go to? (1 - ${lastPage})`,
                    style: TextInputStyle.Short,
                    required: true,
                    type: ComponentType.TextInput
                }],
                type: ComponentType.ActionRow
            }],
            custom_id: key,
            title: "Go to Page"
        });

        const response = await interaction.awaitModalSubmit(key);
        if (response === undefined) {
            return;
        }

        await response.deferUpdate();

        const value = response.data.components[0].components[0].value;
        const page = parseInt(value);

        if (page >= 1 && page <= lastPage) {
            return page;
        }

        await interaction.editOriginalMessage({
            components: [],
            content: `${config.emotes.error} That is not a valid page`
        });
    }

    /**
     * Gets the buttons for pagination.
     *
     * @param previous The previous button data.
     * @param next The next button data.
     * @returns An array of button components.
     */
    #getButtons(
        previous: APIButtonComponentWithCustomId,
        next: APIButtonComponentWithCustomId
    ): APIButtonComponentWithCustomId[] {
        return [
            { ...previous, label: "Previous" },
            { ...next, label: "Next" },
            {
                custom_id: "menu",
                emoji: {
                    id: config.emotes.menu.id,
                    name: config.emotes.menu.name
                },
                style: ButtonStyle.Primary,
                type: ComponentType.Button
            }
        ];
    }

    /**
     * Gets the content for the menu.
     *
     * @param sortOptions The sort options.
     * @returns The content for the menu.
     */
    #getMenuContent(sortOptions: SortOptions): APIInteractionResponseCallbackDataWithFiles {
        const prettySelectedSortBy = sortOptions.by === MemberActivitySortBy.Experience ? "Reputation" : "Experience";
        const prettySelectedSortOrder = sortOptions.order === MemberActivitySortOrder.Ascending ? "Descending" : "Ascending";

        const prettySortBy = sortOptions.by === MemberActivitySortBy.Experience ? "Experience" : "Reputation";
        const prettySortOrder = sortOptions.order === MemberActivitySortOrder.Ascending ? "Ascending" : "Descending";

        return {
            components: [{
                components: [{
                    custom_id: "menu_option",
                    options: [
                        {
                            description: "Go to a specific page on the leaderboard.",
                            emoji: { id: "1136016818683789412" },
                            label: "Go to Page",
                            value: LeaderboardMenuOption.GoToPage
                        },
                        {
                            description: `Currently set to: ${prettySortBy}`,
                            emoji: { id: "1136017623226794074" },
                            label: `Sort By — ${prettySelectedSortBy}`,
                            value: LeaderboardMenuOption.SortBy
                        },
                        {
                            description: `Currently set to: ${prettySortOrder}`,
                            emoji: { id: "1136013968905879623" },
                            label: `Order — ${prettySelectedSortOrder}`,
                            value: LeaderboardMenuOption.SortOrder
                        }
                    ],
                    type: ComponentType.StringSelect
                }],
                type: ComponentType.ActionRow
            }],
            flags: MessageFlags.Ephemeral
        };
    }

    /**
     * Gets the content for a specific page in the pagination.
     *
     * @param guildID The ID of the guild.
     * @param index The index of the selected page.
     * @param sortOptions The sort options.
     * @returns The content for the page.
     */
    async #getPageContent(
        guildID: string,
        index: number,
        sortOptions: SortOptions
    ): Promise<APIInteractionResponseCallbackDataWithFiles> {
        const page = index + 1;
        const members = await this.module.memberActivity.getAll(guildID, {
            limit: PAGE_SIZE,
            page: page,
            sortBy: sortOptions.by,
            sortOrder: sortOptions.order
        });

        const leaderboard = new LeaderboardCanvas(this.module, members, page);
        const buffer = await leaderboard.generate(sortOptions.by);

        return {
            attachments: [{ id: "0" }],
            files: [{
                data: buffer,
                name: "leaderboard.png"
            }]
        };
    }
}
