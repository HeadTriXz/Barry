import {
    type BaseGuildSettingOptionData,
    type OptionalCallback,
    GuildSettingType,
    TypedGuildSettingOption
} from "../option.js";
import type { GuildInteraction, UpdatableInteraction } from "@barry/core";
import type { BaseSettings } from "../../types/modules.js";

import { ComponentType, MessageFlags, TextInputStyle } from "@discordjs/core";
import { getEmoji, normalizeEmoji } from "../emojis.js";
import { timeoutContent } from "../../common.js";
import config from "../../config.js";

/**
 * Represents the keys of an emoji option.
 */
export interface EmojiGuildSettingOptionKeys<
    T extends BaseSettings,
    IK extends keyof T,
    NK extends keyof T
> {
    /**
     * The key for the emoji ID.
     */
    id: IK;

    /**
     * The key for the emoji name.
     */
    name: NK;
}

/**
 * Options for an emoji guild setting.
 */
export interface EmojiGuildSettingOptionData<
    T extends BaseSettings,
    IK extends Extract<keyof T, string>,
    NK extends Extract<keyof T, string>
> extends BaseGuildSettingOptionData<EmojiGuildSettingOption<T, IK, NK>> {
    /**
     * The keys for the emoji option.
     */
    emojiKeys: EmojiGuildSettingOptionKeys<T, IK, NK>;
}

/**
 * Represents an emoji guild setting.
 */
export class EmojiGuildSettingOption<
    T extends BaseSettings,
    IK extends Extract<keyof T, string>,
    NK extends Extract<keyof T, string>
> extends TypedGuildSettingOption<EmojiGuildSettingOption<T, IK, NK>, T, NK> {
    /**
     * The key of the emoji ID.
     */
    idKey: IK;

    /**
     * The key of the emoji name.
     */
    nameKey: NK;

    /**
     * The type of the setting.
     */
    type: GuildSettingType.Emoji = GuildSettingType.Emoji;

    /**
     * Represents an emoji guild setting.
     *
     * @param options The options for the setting.
     */
    constructor(options: OptionalCallback<EmojiGuildSettingOptionData<T, IK, NK>>) {
        super({
            onEdit: (self, interaction) => this.handle(interaction),
            onView: (self, interaction) => this.getValue(interaction),
            type: GuildSettingType.Emoji,
            ...options
        });

        this.idKey = options.emojiKeys.id;
        this.nameKey = options.emojiKeys.name;
    }

    /**
     * Retrieves the value of the setting.
     *
     * @param interaction The interaction that triggered the setting.
     * @returns The formatted string.
     */
    async getValue(interaction: GuildInteraction<UpdatableInteraction>): Promise<string> {
        if (this.store === undefined) {
            throw new Error("The store of the setting is undefined.");
        }

        const id = await this.store.getValue(interaction.guildID, this.idKey) as string | null;
        const name = await this.store.getValue(interaction.guildID, this.nameKey) as string | null;

        if (name === null) {
            return "`None`";
        }

        return id !== null
            ? `<:${name}:${id}>`
            : name;
    }

    /**
     * Handles the interaction for the setting.
     *
     * @param interaction The interaction that triggered the setting.
     */
    async handle(interaction: GuildInteraction<UpdatableInteraction>): Promise<void> {
        if (this.store === undefined) {
            throw new Error("The store of the setting is undefined.");
        }

        const id = await this.store.getValue(interaction.guildID, this.idKey) as string | null;
        const name = await this.store.getValue(interaction.guildID, this.nameKey) as string | null;

        if (typeof id !== "string" && id !== null) {
            throw new Error(`The setting '${this.idKey}' is not of type 'string'.`);
        }

        if (typeof name !== "string" && !(this.nullable && name === null)) {
            throw new Error(`The setting '${this.nameKey}' is not of type 'string'.`);
        }

        const key = `config-emoji-${Date.now()}`;
        await interaction.createModal({
            components: [{
                components: [{
                    custom_id: "emoji",
                    label: this.name,
                    min_length: this.nullable ? 0 : 1,
                    placeholder: "e.g., 😁, :smile:, or <:custom:1234567890123456789>",
                    style: TextInputStyle.Short,
                    type: ComponentType.TextInput,
                    value: name || ""
                }],
                type: ComponentType.ActionRow
            }],
            custom_id: key,
            title: "Select an emoji"
        });

        const response = await interaction.awaitModalSubmit(key);
        if (response === undefined) {
            return interaction.editParent(timeoutContent);
        }

        await response.deferUpdate();

        let emojiID: string | null = null;
        let emojiName: string | null = null;

        const newValue = normalizeEmoji(response.values.emoji);
        if (newValue !== "") {
            const emoji = getEmoji(newValue);
            if (emoji !== null) {
                emojiID = emoji.id;
                emojiName = emoji.name;
            } else {
                const emojis = await interaction.client.api.guilds.getEmojis(interaction.guildID);
                const emoji = emojis.find((emoji) => emoji.name === newValue);
                if (emoji !== undefined) {
                    emojiID = emoji.id;
                    emojiName = emoji.name;
                }
            }
        }

        if (emojiName === null && !this.nullable) {
            return response.createMessage({
                content: `${config.emotes.error} The value you entered is not an emoji.`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (emojiID !== id || emojiName !== name) {
            await this.store.set(interaction.guildID, {
                [this.idKey]: emojiID,
                [this.nameKey]: emojiName
            } as unknown as T);
        }
    }
}
