import {
    type APISelectMenuOption,
    ComponentType,
    MessageFlags,
    PermissionFlagsBits
} from "@discordjs/core";
import {
    type ApplicationCommandInteraction,
    type ModuleRegistry,
    type ReplyableInteraction,
    SlashCommand,
    UpdatableInteraction
} from "@barry/core";
import { type BaseGuildSettings, ModifyGuildSettingHandlers } from "./handlers.js";
import {
    type ParsedGuildSettingConfig,
    type ParsedGuildSettingOption,
    ConfigurableModule,
    GuildSettingType
} from "../../../../../ConfigurableModule.js";
import type { ModuleWithSettings } from "../../../../../types/modules.js";
import type GeneralModule from "../../../index.js";

import { timeoutContent } from "../../../../../common.js";
import config, { type Emoji } from "../../../../../config.js";

/**
 * Represents the base configurable options for a guild.
 */
export type BaseGuildSettingsConfig = ParsedGuildSettingConfig<ModuleWithSettings<BaseGuildSettings>>;

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
            defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
            guildOnly: true
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
     * Format the value of a setting.
     *
     * @param type The type of the setting.
     * @param settings The settings of the guild.
     * @param option The option to format.
     * @returns The formatted value.
     */
    formatValue<T extends BaseGuildSettings>(
        settings: T,
        option: ParsedGuildSettingOption<ModuleWithSettings<T>, GuildSettingType, T>
    ): string {
        const value = settings[option.key];
        if (option.nullable && value === null) {
            return "`None`";
        }

        if (Array.isArray(value) && value.length === 0) {
            return "`None`";
        }

        switch (option.type) {
            case GuildSettingType.Boolean: {
                return value ? "`True`" : "`False`";
            }
            case GuildSettingType.Channel: {
                return `<#${value}>`;
            }
            case GuildSettingType.ChannelArray: {
                return (value as string[]).map((x) => `<#${x}>`).join(", ");
            }
            case GuildSettingType.Custom: {
                return this.formatValue(settings, { ...option, type: option.base || GuildSettingType.String });
            }
            case GuildSettingType.Emoji: {
                if (option.emojiKeys === undefined) {
                    throw new Error("Missing 'emojiKeys' for option of type 'Emoji'.");
                }

                const emojiName = settings[option.emojiKeys["name"]] as string;
                const emojiID = settings[option.emojiKeys["id"]] as string | null;

                return emojiID !== null
                    ? `<:${emojiName}:${emojiID}>`
                    : emojiName;
            }
            case GuildSettingType.Role: {
                return `<@&${value}>`;
            }
            case GuildSettingType.RoleArray: {
                return (value as string[]).map((x) => `<@&${x}>`).join(", ");
            }
            default: {
                const escaped = new String(value).replace(/`/g, "`\u200B");
                return `\`\`${escaped}\`\``;
            }
        }
    }

    /**
     * Returns the emoji for the specified setting.
     *
     * @param type The type of the setting.
     * @param value The value of the setting.
     * @returns The emoji for the setting.
     */
    getEmoji(type: GuildSettingType, value?: unknown): Emoji {
        if (value === null) {
            return config.emotes.unknown;
        }

        if (type === GuildSettingType.Boolean) {
            return value
                ? config.emotes.check
                : config.emotes.unavailable;
        }

        if (type === GuildSettingType.Channel || type === GuildSettingType.ChannelArray) {
            return config.emotes.channel;
        }

        if (type === GuildSettingType.Role || type === GuildSettingType.RoleArray) {
            return config.emotes.role;
        }

        if (type === GuildSettingType.Emoji) {
            return config.emotes.emoji;
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
    async showModule(
        interaction: UpdatableInteraction,
        moduleID: string,
        cache: Record<string, BaseGuildSettings> = {}
    ): Promise<void> {
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
            const moduleConfig = module.getConfig() as BaseGuildSettingsConfig;

            for (const setting of moduleConfig) {
                const key = setting.repository.constructor.name;
                const settings = cache[key] ??= await setting.repository.getOrCreate(interaction.guildID);

                const emoji = this.getEmoji(setting.type, settings[setting.key]);
                selectOptions.push({
                    description: setting.description,
                    emoji: {
                        animated: emoji.animated,
                        id: emoji.id,
                        name: emoji.name
                    },
                    label: setting.name,
                    value: setting.key
                });

                embedOptions.push({
                    emoji: this.getEmoji(setting.type, settings[setting.key]),
                    name: setting.name,
                    value: this.formatValue(settings, setting)
                });
            }
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
                title: module.name,
                description: module.description + "\n\n"
                    + embedOptions.map((o) => `${o.emoji} **${o.name}**: ${o.value}`).join("\n")
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
            return this.showModule(response, `${moduleID}.${key}`, cache);
        }

        if (!(module instanceof ConfigurableModule)) {
            throw new Error(`Module '${moduleID}' is not configurable.`);
        }

        const moduleConfig = module.getConfig() as BaseGuildSettingsConfig;
        const option = moduleConfig.find((x) => x.key === key);
        if (option === undefined) {
            throw new Error(`Option '${key}' not found.`);
        }

        const settings = cache[option.repository.constructor.name];
        const handler = new ModifyGuildSettingHandlers(module);
        await handler.handle(response, settings, option);

        await this.showModule(response, moduleID, cache);
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
    #getAllModules(modules: ModuleRegistry): Array<ConfigurableModule<BaseGuildSettings>> {
        return modules
            .all()
            .filter((module) => {
                return module instanceof ConfigurableModule || this.#getAllModules(module.dependencies).length > 0;
            }) as Array<ConfigurableModule<BaseGuildSettings>>;
    }
}
