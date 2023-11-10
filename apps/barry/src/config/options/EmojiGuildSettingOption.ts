import {
    type BaseGuildSettingOptionData,
    type OptionalCallback,
    BaseGuildSettingOption,
    GuildSettingType
} from "../option.js";
import type { GuildInteraction, UpdatableInteraction } from "@barry/core";
import type { BaseSettings } from "../../types/modules.js";

import { ComponentType, MessageFlags, TextInputStyle } from "@discordjs/core";
import { getEmoji, normalizeEmoji } from "../emojis.js";
import { GuildSettingStore } from "../store.js";
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
    IK extends keyof T,
    NK extends keyof T
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
    IK extends keyof T,
    NK extends keyof T
> extends BaseGuildSettingOption<EmojiGuildSettingOption<T, IK, NK>> {
    /**
     * The store for the emoji ID.
     */
    idStore: GuildSettingStore<T, IK> = new GuildSettingStore();

    /**
     * The store for the emoji name.
     */
    nameStore: GuildSettingStore<T, NK> = new GuildSettingStore();

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
            ...options
        });

        this.idStore.setKey(options.emojiKeys.id);
        this.nameStore.setKey(options.emojiKeys.name);
    }

    /**
     * Retrieves the value of the setting.
     *
     * @param interaction The interaction that triggered the setting.
     * @returns The formatted string.
     */
    async getValue(interaction: GuildInteraction<UpdatableInteraction>): Promise<string> {
        const id = await this.idStore.get(interaction.guildID) as string | null;
        const name = await this.nameStore.get(interaction.guildID) as string | null;

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
        const id = await this.idStore.get(interaction.guildID) as string | null;
        const name = await this.nameStore.get(interaction.guildID) as string | null;

        if (typeof id !== "string" && id !== null) {
            throw new Error(`The setting '${String(this.idStore.getKey())}' is not of type 'string'.`);
        }

        if (typeof name !== "string" && !(this.nullable && name === null)) {
            throw new Error(`The setting '${String(this.nameStore.getKey())}' is not of type 'string'.`);
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

        if (emojiID !== id) {
            await this.idStore.set(interaction.guildID, emojiID as T[IK]);
        }

        if (emojiName !== name) {
            await this.nameStore.set(interaction.guildID, emojiName as T[NK]);
        }
    }
}
