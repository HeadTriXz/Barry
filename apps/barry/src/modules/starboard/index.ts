import {
    type APIEmoji,
    type APIGuildMember,
    type RESTGetAPIChannelMessageResult,
    type RESTPostAPIChannelMessageJSONBody,
    ButtonStyle,
    ComponentType
} from "@discordjs/core";
import type { StarboardMessage, StarboardSettings } from "@prisma/client";
import type { Application } from "../../Application.js";
import type { ModuleWithSettings } from "../../types/modules.js";

import {
    BooleanGuildSettingOption,
    ChannelArrayGuildSettingOption,
    ChannelGuildSettingOption,
    EmojiGuildSettingOption,
    IntegerGuildSettingOption,
    RoleArrayGuildSettingOption
} from "../../config/options/index.js";
import {
    StarboardMessageRepository,
    StarboardReactionRepository,
    StarboardSettingsRepository
} from "./database/index.js";
import { ConfigurableModule } from "../../config/module.js";
import { getAvatarURL } from "@barry/core";
import { loadEvents } from "../../utils/loadFolder.js";

import config from "../../config.js";

/**
 * Represents the options for updating a starboard message.
 */
export interface UpdateMessageOptions {
    /**
     * The ID of the author of the message.
     */
    authorID?: string;

    /**
     * The ID of the channel the message was sent in.
     */
    channelID: string;

    /**
     * The emoji that was reacted with.
     */
    emoji: APIEmoji;

    /**
     * The ID of the guild the message was sent in.
     */
    guildID: string;

    /**
     * The member that reacted to the message.
     */
    member?: APIGuildMember;

    /**
     * The ID of the message that was reacted to.
     */
    messageID: string;

    /**
     * The ID of the user that reacted to the message.
     */
    userID: string;
}

/**
 * Represents the starboard module.
 */
export default class StarboardModule extends ConfigurableModule<StarboardModule> implements ModuleWithSettings<
    StarboardSettings
> {
    /**
     * The repository for managing starboard messages.
     */
    messages: StarboardMessageRepository;

    /**
     * The repository for managing starboard reactions.
     */
    reactions: StarboardReactionRepository;

    /**
     * The repository for managing the settings of this module.
     */
    settings: StarboardSettingsRepository;

    /**
     * Represents the starboard module.
     *
     * @param client The client that initialized the module.
     */
    constructor(client: Application) {
        super(client, {
            id: "starboard",
            name: "Starboard",
            description: "A module that allows users to star messages and have them posted in a channel.",
            events: loadEvents("./events")
        });

        this.messages = new StarboardMessageRepository(client.prisma);
        this.reactions = new StarboardReactionRepository(client.prisma);
        this.settings = new StarboardSettingsRepository(client.prisma);

        this.defineConfig({
            settings: {
                allowedChannels: new ChannelArrayGuildSettingOption({
                    description: "The channels where users are allowed to star messages.",
                    name: "Allowed Channels"
                }),
                allowedRoles: new RoleArrayGuildSettingOption({
                    description: "The roles that are allowed to star messages.",
                    name: "Allowed Roles"
                }),
                autoReactChannels: new ChannelArrayGuildSettingOption({
                    description: "The channels where images are automatically starred.",
                    name: "Auto React Channels"
                }),
                channelID: new ChannelGuildSettingOption({
                    description: "The channel where starred messages are posted.",
                    name: "Starboard Channel",
                    nullable: true
                }),
                emojiName: new EmojiGuildSettingOption({
                    description: "The emoji that is used to star messages.",
                    emojiKeys: {
                        id: "emojiID",
                        name: "emojiName"
                    },
                    name: "Star Emoji"
                }),
                enabled: new BooleanGuildSettingOption({
                    description: "Whether this module is enabled.",
                    name: "Enabled"
                }),
                ignoredChannels: new ChannelArrayGuildSettingOption({
                    description: "The channels where messages are ignored.",
                    name: "Ignored Channels"
                }),
                ignoredRoles: new RoleArrayGuildSettingOption({
                    description: "The roles that are ignored.",
                    name: "Ignored Roles"
                }),
                threshold: new IntegerGuildSettingOption({
                    description: "The amount of stars required to post a message in the starboard.",
                    name: "Star Threshold"
                })
            }
        });
    }

    /**
     * Generates the content for a starboard message.
     *
     * @param sbMessage The message to post in the starboard.
     * @returns The content of the message.
     */
    async getContent(sbMessage: StarboardMessage, count: number): Promise<RESTPostAPIChannelMessageJSONBody> {
        const message = await this.client.api.channels.getMessage(sbMessage.channelID, sbMessage.messageID);
        const messageLink = `https://discord.com/channels/${sbMessage.guildID}/${sbMessage.channelID}/${sbMessage.messageID}`;
        const imageURL = this.getImage(message);

        return {
            components: [{
                components: [{
                    label: "Jump to Message",
                    style: ButtonStyle.Link,
                    type: ComponentType.Button,
                    url: messageLink
                }],
                type: ComponentType.ActionRow
            }],
            content: `**${this.getStar(count)} ${count}** <#${sbMessage.channelID}>`,
            embeds: [{
                author: {
                    name: message.author.username,
                    icon_url: getAvatarURL(message.author)
                },
                color: config.defaultColor,
                description: message.content.slice(0, 1800),
                image: imageURL
                    ? { url: imageURL }
                    : undefined
            }]
        };
    }

    /**
     * Returns the URL of the image in a message, if any.
     *
     * @param message The message to get the image from.
     * @returns The image URL, if any.
     */
    getImage(message: RESTGetAPIChannelMessageResult): string | undefined {
        for (const attachment of message.attachments) {
            if (/\.(jpe?g|png|gif|webp)/i.test(attachment.url)) {
                return attachment.url;
            }
        }

        for (const embed of message.embeds) {
            if (embed.image !== undefined) {
                return embed.image.url;
            }

            if (embed.thumbnail !== undefined) {
                return embed.thumbnail.url;
            }
        }
    }

    /**
     * Returns the star emoji for the given count.
     *
     * @param count The amount of stars.
     * @returns The star emoji.
     */
    getStar(count: number): string {
        if (count < 5) return "⭐";
        if (count < 10) return "🌟";
        if (count < 20) return "💫";
        if (count < 50) return "✨";
        return "🌠";
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
     * Updates the starboard message.
     *
     * @param options The options for updating the message.
     */
    async updateMessage(options: UpdateMessageOptions): Promise<void> {
        const settings = await this.settings.getOrCreate(options.guildID);
        if (!settings.enabled || settings.channelID === null || settings.channelID === options.channelID) {
            return;
        }

        if (options.member !== undefined) {
            if (options.member.user === undefined) {
                return this.client.logger.warn("Missing 'user' on member object.");
            }

            const isValidEmoji = options.emoji.id === settings.emojiID && options.emoji.name === settings.emojiName;
            if (!isValidEmoji) {
                return;
            }

            const inValidChannel = settings.allowedChannels.length === 0
                || settings.allowedChannels.includes(options.channelID);
            if (!inValidChannel) {
                return;
            }

            const hasValidRole = settings.allowedRoles.length === 0
                || settings.allowedRoles.some((roleID) => options.member?.roles.includes(roleID));
            if (!hasValidRole) {
                return;
            }

            const isValid = !options.member.user.bot
                && options.member.user.id !== options.authorID
                && !settings.ignoredChannels.includes(options.channelID)
                && !settings.ignoredRoles.some((roleID) => options.member?.roles.includes(roleID));

            if (!isValid) {
                return;
            }
        }

        const message = await this.messages.get(options.channelID, options.messageID);
        if (message === null) {
            if (options.authorID === undefined) {
                return;
            }

            await this.messages.create({
                authorID: options.authorID,
                channelID: options.channelID,
                guildID: options.guildID,
                messageID: options.messageID
            });
        }

        const hasReacted = await this.reactions.has(options.channelID, options.messageID, options.userID);
        if (options.member !== undefined) {
            if (hasReacted) {
                return;
            }

            await this.reactions.create(options.channelID, options.messageID, options.userID);
        } else {
            if (!hasReacted) {
                return;
            }

            await this.reactions.delete(options.channelID, options.messageID, options.userID);
        }

        if (message === null) {
            return;
        }

        const count = await this.reactions.getCount(options.channelID, options.messageID);
        if (count >= settings.threshold) {
            if (message.crosspostID === null) {
                const content = await this.getContent(message, count);
                const msg = await this.client.api.channels.createMessage(settings.channelID, content);

                await this.messages.setCrosspostID(message.channelID, message.messageID, msg.id);
            } else {
                await this.client.api.channels.editMessage(settings.channelID, message.crosspostID, {
                    content: `**${this.getStar(count)} ${count}** <#${options.channelID}>`
                });
            }
        }
    }
}
