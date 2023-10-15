import type {
    APIEmbed,
    APIGuild,
    APIUser,
    RESTPostAPIChannelMessageJSONBody
} from "@discordjs/core";
import {
    type APIInteractionResponseCallbackDataWithFiles,
    Module,
    getAvatarURL
} from "@barry/core";
import type { Application } from "../../Application.js";
import type { Image } from "@napi-rs/canvas";
import type { ModuleWithSettings } from "../../types/modules.js";
import type { WelcomerSettings } from "@prisma/client";

import { Canvas, loadImage } from "canvas-constructor/napi-rs";
import { WelcomerSettingsRepository } from "./database/index.js";
import { loadEvents } from "../../utils/loadFolder.js";

/**
 * Represents the welcomer module.
 */
export default class WelcomerModule extends Module<Application> implements ModuleWithSettings<WelcomerSettings> {
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
