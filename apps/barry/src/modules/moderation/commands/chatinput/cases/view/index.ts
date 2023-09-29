import {
    type APIGuild,
    type APIUser,
    MessageFlags,
    PermissionFlagsBits
} from "@discordjs/core";
import {
    type ApplicationCommandInteraction,
    SlashCommand,
    SlashCommandOptionBuilder,
    getAvatarURL
} from "@barry/core";
import type { CaseWithNotes } from "../../../../database/index.js";
import type ModerationModule from "../../../../index.js";

import { CASE_EMOJIS, CASE_TITLES } from "../../../../constants.js";
import { CaseType } from "@prisma/client";
import { PaginationMessage } from "../../../../../../utils/pagination.js";
import { getCaseContent } from "../content.js";
import config from "../../../../../../config.js";

/**
 * Options for the "/cases view" command.
 */
export interface ViewCasesOptions {
    /**
     * The ID of the case to view.
     */
    case?: number;

    /**
     * The type of cases to view.
     */
    type?: CaseType;

    /**
     * The user to view cases for.
     */
    user?: APIUser;
}

/**
 * The maximum number of cases to display per page.
 */
const CASE_PAGE_SIZE = 15;

/**
 * The maximum number of notes to display per page.
 */
const NOTE_PAGE_SIZE = 4;

/**
 * Represents a slash command to view specific or all cases.
 */
export default class extends SlashCommand<ModerationModule> {
    /**
     * Represents a slash command to view specific or all cases.
     *
     * @param module The module that this command belongs to.
     */
    constructor(module: ModerationModule) {
        super(module, {
            name: "view",
            description: "View specific or all cases.",
            defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
            guildOnly: true,
            options: {
                case: SlashCommandOptionBuilder.integer({
                    description: "The ID of the case to view.",
                    minimum: 1
                }),
                user: SlashCommandOptionBuilder.user({
                    description: "The user to view cases for."
                }),
                type: SlashCommandOptionBuilder.string({
                    description: "The type of cases to view.",
                    choices: Object.keys(CaseType)
                        .filter((key) => isNaN(Number(key)))
                        .map((key) => ({
                            name: CASE_TITLES[key as CaseType],
                            value: key
                        }))
                })
            }
        });
    }

    /**
     * Show specific or all cases for the specified guild or user.
     *
     * @param interaction The interaction that triggered the command.
     * @param options The options for the command.
     */
    async execute(interaction: ApplicationCommandInteraction, options: ViewCasesOptions): Promise<void> {
        if (!interaction.isInvokedInGuild()) {
            return;
        }

        if (options.case !== undefined) {
            const entity = await this.module.cases.get(interaction.guildID, options.case, true);
            if (entity === null) {
                return interaction.createMessage({
                    content: `${config.emotes.error} That case does not exist.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            return this.#showCase(interaction, entity);
        }

        if (options.user !== undefined) {
            return this.#showUser(interaction, options.user, options.type);
        }

        const guild = await this.client.api.guilds.get(interaction.guildID);
        return this.#showGuild(interaction, guild, options.type);
    }

    /**
     * Shows the specified case.
     *
     * @param interaction The interaction that triggered the command.
     * @param entity The case to show.
     */
    async #showCase(interaction: ApplicationCommandInteraction, entity: CaseWithNotes): Promise<void> {
        const creator = await this.client.api.users.get(entity.creatorID);
        const user = await this.client.api.users.get(entity.userID);

        await PaginationMessage.create({
            content: (notes) => getCaseContent(entity, notes, creator, user),
            interaction: interaction,
            pageSize: NOTE_PAGE_SIZE,
            values: entity.notes
        });
    }

    /**
     * Shows the most recent cases for the specified guild.
     *
     * @param interaction The interaction that triggered the command.
     * @param guild The guild to show cases for.
     * @param type The type of cases to show.
     */
    async #showGuild(interaction: ApplicationCommandInteraction, guild: APIGuild, type?: CaseType): Promise<void> {
        const entities = await this.module.cases.getAll(guild.id, type);
        const pageCount = Math.ceil(entities.length / CASE_PAGE_SIZE);

        await PaginationMessage.create({
            content: (cases, i) => {
                const formatted = cases
                    .map((c) => `${CASE_EMOJIS[c.type]} \`${c.id}\` <@${c.userID}> — <t:${Math.trunc(c.createdAt.getTime() / 1000)}:R>`)
                    .join("\n");

                return {
                    embeds: [{
                        author: {
                            icon_url: guild.icon !== null
                                ? this.client.api.rest.cdn.icon(guild.id, guild.icon, { size: 128 })
                                : undefined,
                            name: guild.name
                        },
                        color: config.defaultColor,
                        description: `Found \`${entities.length}\` cases for \`${guild.name}\``
                            + `\n\n${formatted}\n\nTo view a specific case, use </cases view:0>`,
                        footer: {
                            text: `Page ${i + 1} of ${pageCount}`
                        },
                        thumbnail: guild.icon !== null ? {
                            url: this.client.api.rest.cdn.icon(guild.id, guild.icon, { size: 256 })
                        } : undefined
                    }]
                };
            },
            interaction: interaction,
            pageSize: CASE_PAGE_SIZE,
            values: entities
        });
    }

    /**
     * Shows the most recent cases for the specified user.
     *
     * @param interaction The interaction that triggered the command.
     * @param user The user to show cases for.
     * @param type The type of cases to show.
     */
    async #showUser(interaction: ApplicationCommandInteraction, user: APIUser, type?: CaseType): Promise<void> {
        if (!interaction.isInvokedInGuild()) {
            throw new Error("Tried showing cases outside a guild.");
        }

        const entities = await this.module.cases.getByUser(interaction.guildID, user.id, type);
        const pageCount = Math.ceil(entities.length / CASE_PAGE_SIZE);

        await PaginationMessage.create({
            content: (cases, i) => {
                const formatted = cases
                    .map((c) => `${CASE_EMOJIS[c.type]} \`${c.id}\` <@${c.creatorID}> — <t:${Math.trunc(c.createdAt.getTime() / 1000)}:R>`)
                    .join("\n");

                return {
                    embeds: [{
                        author: {
                            icon_url: getAvatarURL(user),
                            name: user.username
                        },
                        color: config.defaultColor,
                        description: `Found \`${entities.length}\` cases for \`${user.username}\``
                            + `\n\n${formatted}\n\nTo view a specific case, use </cases view:0>`,
                        footer: {
                            text: `Page ${i + 1} of ${pageCount}`
                        },
                        thumbnail: {
                            url: getAvatarURL(user)
                        }
                    }]
                };
            },
            interaction: interaction,
            pageSize: CASE_PAGE_SIZE,
            values: entities
        });
    }
}
