import {
    type APIEmbed,
    type APIGuild,
    type APIUser,
    type RESTPostAPIChannelMessageJSONBody,
    ComponentType,
    MessageFlags,
    TextInputStyle
} from "@discordjs/core";
import {
    type APIInteractionResponseCallbackDataWithFiles,
    type UpdatableInteraction,
    getAvatarURL
} from "@barry/core";
import type { Application } from "../../Application.js";
import type { Image } from "@napi-rs/canvas";
import type { WelcomerSettings } from "@prisma/client";

import { Canvas, loadImage } from "canvas-constructor/napi-rs";
import { ConfigurableModule, GuildSettingOptionBuilder } from "../../ConfigurableModule.js";
import { WelcomerSettingsRepository } from "./database/index.js";
import { loadEvents } from "../../utils/loadFolder.js";
import { timeoutContent } from "../../common.js";
import config from "../../config.js";

/**
 * Represents the welcomer module.
 */
export default class WelcomerModule extends ConfigurableModule<WelcomerSettings> {
    /**
     * The repository for managing the settings of this module.
     */
    settings: WelcomerSettingsRepository;

    /**
     * The background image for the welcome message.
     */
    #background: Image | null = null;

    /**
     * Represents the welcomer module.
     *
     * @param client The client that initialized the module.
     */
    constructor(client: Application) {
        super(client, {
            id: "welcomer",
            name: "Welcomer",
            description: "Sends a welcome message when a new member joins the server.",
            events: loadEvents("./events")
        });

        this.settings = new WelcomerSettingsRepository(client.prisma);

        this.defineConfig({
            settings: {
                channelID: GuildSettingOptionBuilder.channel({
                    description: "The channel to send the welcome message in.",
                    name: "Welcome Channel",
                    nullable: true
                }),
                content: GuildSettingOptionBuilder.string({
                    description: "The content of the welcome message (e.g., {user.mention}).",
                    name: "Welcome Message",
                    nullable: true
                }),
                embedAuthor: GuildSettingOptionBuilder.string({
                    description: "The author of the welcome message embed (e.g., {user.name}).",
                    name: "Embed Author",
                    nullable: true
                }),
                embedAuthorIcon: GuildSettingOptionBuilder.string({
                    description: "The icon of the welcome message embed author (e.g., {user.avatar}).",
                    name: "Embed Author Icon",
                    nullable: true
                }),
                embedColor: GuildSettingOptionBuilder.custom({
                    callback: this.handleColor.bind(this),
                    description: "The color of the welcome message embed.",
                    name: "Embed Color",
                    nullable: true
                }),
                embedDescription: GuildSettingOptionBuilder.string({
                    description: "The description of the welcome message embed.",
                    name: "Embed Description",
                    nullable: true
                }),
                embedFooter: GuildSettingOptionBuilder.string({
                    description: "The footer of the welcome message embed.",
                    name: "Embed Footer",
                    nullable: true
                }),
                embedFooterIcon: GuildSettingOptionBuilder.string({
                    description: "The icon of the welcome message embed footer (e.g., {guild.icon}).",
                    name: "Embed Footer Icon",
                    nullable: true
                }),
                embedImage: GuildSettingOptionBuilder.string({
                    description: "The image of the welcome message embed.",
                    name: "Embed Image",
                    nullable: true
                }),
                embedThumbnail: GuildSettingOptionBuilder.string({
                    description: "The thumbnail of the welcome message embed. (e.g., {guild.icon})",
                    name: "Embed Thumbnail",
                    nullable: true
                }),
                embedTimestamp: GuildSettingOptionBuilder.boolean({
                    description: "Whether the welcome message embed should have a timestamp.",
                    name: "Embed Timestamp"
                }),
                embedTitle: GuildSettingOptionBuilder.string({
                    description: "The title of the welcome message embed (e.g., {guild.name}).",
                    name: "Embed Title",
                    nullable: true
                }),
                enabled: GuildSettingOptionBuilder.boolean({
                    description: "Whether this module is enabled.",
                    name: "Enabled"
                }),
                withImage: GuildSettingOptionBuilder.boolean({
                    description: "Whether the welcome message should have a generated image.",
                    name: "With Generated Image"
                })
            }
        });
    }

    /**
     * Creates the image for the welcome message.
     *
     * @param user The user that joined the guild.
     * @returns The image for the welcome message.
     */
    async createImage(user: APIUser): Promise<Buffer> {
        this.#background ??= await loadImage("./assets/images/welcome.png");

        const avatarURL = getAvatarURL(user);
        const avatar = await loadImage(avatarURL);

        const canvas = new Canvas(1600, 600)
            .printImage(this.#background, 0, 0)
            .printCircularImage(avatar, 800, 226.5, 148);

        return canvas.pngAsync();
    }

    /**
     * Generates the content for the welcome message.
     *
     * @param guildID The ID of the guild.
     * @param user The user that joined the guild.
     * @returns The content for the welcome message.
     */
    async getContent(user: APIUser, settings: WelcomerSettings): Promise<RESTPostAPIChannelMessageJSONBody> {
        const guild = await this.client.api.guilds.get(settings.guildID);

        const content: APIInteractionResponseCallbackDataWithFiles = {};
        const embed: APIEmbed = {};

        if (settings.content !== null) {
            content.content = this.replacePlaceholders(settings.content, guild, user);
        }

        const addEmbedProperty = <T extends keyof APIEmbed>(property: T, value: APIEmbed[T]): void => {
            if (embed[property] === undefined) {
                embed[property] = value;
            } else if (typeof embed[property] === "object") {
                embed[property] = Object.assign(value!, embed[property]);
            }
        };

        if (settings.embedAuthor !== null) {
            addEmbedProperty("author", {
                name: this.replacePlaceholders(settings.embedAuthor, guild, user)
            });
        }

        if (settings.embedAuthorIcon !== null) {
            addEmbedProperty("author", {
                icon_url: this.replacePlaceholders(settings.embedAuthorIcon, guild, user),
                name: "\u200B"
            });
        }

        if (settings.embedDescription !== null) {
            addEmbedProperty("description", this.replacePlaceholders(settings.embedDescription, guild, user));
        }

        if (settings.embedFooter !== null) {
            addEmbedProperty("footer", {
                text: this.replacePlaceholders(settings.embedFooter, guild, user)
            });
        }

        if (settings.embedFooterIcon !== null) {
            addEmbedProperty("footer", {
                icon_url: this.replacePlaceholders(settings.embedFooterIcon, guild, user),
                text: "\u200B"
            });
        }

        if (settings.embedImage !== null && !settings.withImage) {
            addEmbedProperty("image", {
                url: this.replacePlaceholders(settings.embedImage, guild, user)
            });
        }

        if (settings.embedThumbnail !== null) {
            addEmbedProperty("thumbnail", {
                url: this.replacePlaceholders(settings.embedThumbnail, guild, user)
            });
        }

        if (settings.embedTitle !== null) {
            addEmbedProperty("title", this.replacePlaceholders(settings.embedTitle, guild, user));
        }

        if (settings.withImage) {
            const image = await this.createImage(user);
            content.files = [{
                data: image,
                name: "welcome.png"
            }];

            if (Object.keys(embed).length > 0) {
                addEmbedProperty("image", {
                    url: "attachment://welcome.png"
                });
            } else {
                content.attachments = [{
                    filename: "welcome.png",
                    id: "0"
                }];
            }
        }

        if (Object.keys(embed).length > 0) {
            if (settings.embedColor !== null) {
                addEmbedProperty("color", settings.embedColor);
            }

            if (settings.embedTimestamp) {
                addEmbedProperty("timestamp", new Date().toISOString());
            }

            content.embeds = [embed];
        }

        return content;
    }

    /**
     * Handles updating a color setting.
     *
     * @param interaction The interaction that triggered the option.
     * @param settings The settings of the guild.
     */
    async handleColor(interaction: UpdatableInteraction, settings: WelcomerSettings): Promise<void> {
        const key = `config-color-${Date.now()}`;
        await interaction.createModal({
            components: [{
                components: [{
                    custom_id: "color",
                    label: "Embed Color",
                    min_length: 0,
                    placeholder: "The color of the welcome message embed.",
                    style: TextInputStyle.Short,
                    type: ComponentType.TextInput,
                    value: settings.embedColor !== null
                        ? `#${settings.embedColor.toString(16).padStart(6, "0")}`
                        : ""
                }],
                type: ComponentType.ActionRow
            }],
            custom_id: key,
            title: "Select a color"
        });

        const response = await interaction.awaitModalSubmit(key);
        if (response === undefined) {
            return interaction.editParent(timeoutContent);
        }

        await response.deferUpdate();
        const rawColor = response.values.color.startsWith("#")
            ? response.values.color.slice(1)
            : response.values.color;

        const color = parseInt(rawColor, 16);
        if (isNaN(color)) {
            return response.createMessage({
                content: `${config.emotes.error} The color you entered is invalid.`,
                flags: MessageFlags.Ephemeral
            });
        }

        await this.settings.upsert(settings.guildID, {
            embedColor: color
        });

        settings.embedColor = color;
    }

    /**
     * Checks if the guild has enabled this module.
     *
     * @param guildID The ID of the guild.
     * @returns Whether the guild has enabled this module.
     */
    async isEnabled(guildID: string): Promise<boolean> {
        const settings = await this.settings.getOrCreate(guildID);
        return settings.enabled;
    }

    /**
     * Replaces the placeholders in the content with the actual values.
     *
     * @param content The content to replace the placeholders in.
     * @param guild The guild to replace the placeholders with.
     * @param user The user to replace the placeholders with.
     * @returns The content with the placeholders replaced.
     */
    replacePlaceholders(content: string, guild: APIGuild, user: APIUser): string {
        const updated = content
            .replace(/{user.mention}/g, `<@${user.id}>`)
            .replace(/{user.name}/g, user.username)
            .replace(/{user.avatar}/g, getAvatarURL(user))
            .replace(/{guild.name}/g, guild.name);

        if (guild.icon !== null) {
            const iconURL = this.client.api.rest.cdn.icon(guild.id, guild.icon);
            return updated.replace(/{guild.icon}/g, iconURL);
        }

        return updated.replace(/{guild.icon}/g, "");
    }
}
