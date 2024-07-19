import {
    type APIEmbedFooter,
    type APISelectMenuOption,
    ComponentType,
    InteractionContextType,
    MessageFlags,
    PermissionFlagsBits
} from "@discordjs/core";
import {
    type ApplicationCommandInteraction,
    type ModuleRegistry,
    type ReplyableInteraction,
    SlashCommand,
    UpdatableInteraction
} from "@barry-bot/core";
import {
    type BaseGuildSettingOption,
    type TypedGuildSettingOption,
    GuildSettingType
} from "../../../../../config/option.js";
import type { BaseSettings } from "../../../../../types/modules.js";
import type GeneralModule from "../../../index.js";

import { ConfigurableModule } from "../../../../../config/module.js";
import { timeoutContent } from "../../../../../common.js";

import config, { type Emoji } from "../../../../../config.js";

/**
 * The base options for the select menu.
 */
export const BASE_OPTIONS: APISelectMenuOption[] = [{
    emoji: {
        id: config.emotes.close.id,
        name: config.emotes.close.name
    },
    label: "Go Back",
    description: "Go back to the previous menu.",
    value: "back"
}];

/**
 * Represents a slash command that manages the configuration of a guild.
 */
export default class extends SlashCommand<GeneralModule> {
    /**
     * Represents a slash command that manages the configuration of a guild.
     *
     * @param module The module the command belongs to.
     */
    constructor(module: GeneralModule) {
        super(module, {
            name: "config",
            description: "Manage the configuration of the bot for this server.",
            contexts: [InteractionContextType.Guild],
            defaultMemberPermissions: PermissionFlagsBits.ManageGuild
        });
    }

    /**
     * Let the user configure the bot for the guild.
     *
     * @param interaction The interaction that invoked the command.
     */
    async execute(interaction: ApplicationCommandInteraction): Promise<void> {
        if (!interaction.isInvokedInGuild()) {
            return;
        }

        await this.showModules(interaction);
    }

    /**
     * Returns the emoji for the specified setting.
     *
     * @param option The option to get the emoji for.
     * @param value The value of the setting.
     * @returns The emoji for the setting.
     */
    getEmoji(option: BaseGuildSettingOption<any>, value?: unknown): Emoji {
        if (value === null) {
            return config.emotes.unknown;
        }

        if ("type" in option) {
            if (option.type === GuildSettingType.Boolean) {
                return value
                    ? config.emotes.check
                    : config.emotes.unavailable;
            }

            if (option.type === GuildSettingType.Channel || option.type === GuildSettingType.ChannelArray) {
                return config.emotes.channel;
            }

            if (option.type === GuildSettingType.Role || option.type === GuildSettingType.RoleArray) {
                return config.emotes.role;
            }

            if (option.type === GuildSettingType.Emoji) {
                return config.emotes.emoji;
            }
        }

        return config.emotes.add;
    }

    /**
     * Shows the configuration for the specified module.
     *
     * @param interaction The interaction that invoked the command.
     * @param moduleID The ID of the module to show the configuration for.
     * @param cache The cache for the settings.
     * @returns The settings of the module.
     */
    async showModule(interaction: UpdatableInteraction, moduleID: string): Promise<void> {
        if (!interaction.isInvokedInGuild()) {
            return;
        }

        const module = this.client.modules.get(moduleID);
        if (module === undefined) {
            throw new Error(`Module '${moduleID}' not found.`);
        }

        const embedOptions = [];
        const selectOptions = [...BASE_OPTIONS];

        const dependencies = this.#getAllModules(module.dependencies);
        for (const dependency of dependencies) {
            selectOptions.push({
                description: dependency.description,
                emoji: {
                    animated: config.emotes.add.animated,
                    id: config.emotes.add.id,
                    name: config.emotes.add.name
                },
                label: dependency.name,
                value: dependency.id
            });
        }

        if (module instanceof ConfigurableModule) {
            const options = module.getConfig();
            for (let i = 0; i < options.length; i++) {
                const option = options[i] as TypedGuildSettingOption<any, BaseSettings, keyof BaseSettings>;

                const value = await option.get(interaction.guildID);
                const emoji = this.getEmoji(option, value);

                selectOptions.push({
                    description: option.description,
                    emoji: {
                        animated: emoji.animated,
                        id: emoji.id,
                        name: emoji.name
                    },
                    label: option.name,
                    value: i.toString()
                });

                const formatted = await option.onView(option, interaction);
                embedOptions.push({
                    emoji: emoji,
                    name: option.name,
                    value: formatted
                });
            }
        }

        let footer: APIEmbedFooter | undefined;
        if (dependencies.length > 0) {
            footer = { text: `You can select from ${dependencies.length} submodules.` };
        }

        await interaction.editParent({
            components: [{
                components: [{
                    custom_id: "config-key",
                    options: selectOptions,
                    placeholder: "Select an option.",
                    type: ComponentType.StringSelect
                }],
                type: ComponentType.ActionRow
            }],
            content: `### ${config.emotes.add} Select an option to configure.`,
            embeds: [{
                description: module.description + "\n\n"
                    + embedOptions.map((o) => `${o.emoji} **${o.name}**: ${o.value}`).join("\n"),
                footer: footer,
                title: module.name
            }]
        });

        const response = await interaction.awaitMessageComponent({
            customIDs: ["config-key"]
        });

        if (!response?.data.isStringSelect()) {
            return interaction.editParent(timeoutContent);
        }

        const key = response.data.values[0];
        if (key === "back") {
            return this.showModules(response);
        }

        if (dependencies.some((x) => x.id === key)) {
            return this.showModule(response, `${moduleID}.${key}`);
        }

        if (!(module instanceof ConfigurableModule)) {
            throw new Error(`Module '${moduleID}' is not configurable.`);
        }

        const options = module.getConfig();
        const option = options[Number(key)] as TypedGuildSettingOption<any, BaseSettings, keyof BaseSettings>;

        if (response.isInvokedInGuild()) {
            await option.onEdit(option, response);
        }

        await this.showModule(response, moduleID);
    }

    /**
     * Shows the modules that can be configured.
     *
     * @param interaction The interaction that invoked the command.
     */
    async showModules(interaction: ReplyableInteraction): Promise<void> {
        if (!interaction.isInvokedInGuild()) {
            return;
        }

        const modules = this.#getAllModules(this.client.modules);

        const respond = interaction instanceof UpdatableInteraction
            ? interaction.editParent.bind(interaction)
            : interaction.createMessage.bind(interaction);

        await respond({
            components: [{
                components: [{
                    custom_id: "config-module",
                    options: modules.map((module) => ({
                        description: module.description,
                        label: module.name,
                        value: module.id
                    })),
                    placeholder: "Select a module.",
                    type: ComponentType.StringSelect
                }],
                type: ComponentType.ActionRow
            }],
            content: `### ${config.emotes.add} Select a module to configure.`,
            embeds: [],
            flags: MessageFlags.Ephemeral
        });

        const response = await interaction.awaitMessageComponent({
            customIDs: ["config-module"]
        });

        if (!response?.data.isStringSelect()) {
            await interaction.editOriginalMessage(timeoutContent);
            return;
        }

        const moduleID = response.data.values[0];
        return this.showModule(response, moduleID);
    }

    /**
     * Returns all configurable modules.
     *
     * @param modules The registry to get all configurable modules from.
     * @returns The configurable modules.
     */
    #getAllModules(modules: ModuleRegistry): Array<ConfigurableModule<any>> {
        return modules
            .all()
            .filter((module) => {
                return module instanceof ConfigurableModule || this.#getAllModules(module.dependencies).length > 0;
            }) as Array<ConfigurableModule<any>>;
    }
}
