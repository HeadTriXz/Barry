import { UpdatableInteraction, type GuildInteraction, ModalSubmitInteraction } from "@barry/core";
import { EmojiGuildSettingOption } from "../../../src/config/options/EmojiGuildSettingOption.js";
import { createMockApplication } from "../../mocks/index.js";
import { createMockMessageComponentInteraction, createMockModalSubmitInteraction } from "@barry/testing";
import { ComponentType, MessageFlags } from "@discordjs/core";
import { timeoutContent } from "../../../src/common.js";
import { GuildSettingType } from "../../../src/config/option.js";

describe("EmojiGuildSettingOption", () => {
    let interaction: GuildInteraction<UpdatableInteraction>;
    let option: EmojiGuildSettingOption<any, any, any>;

    beforeEach(() => {
        const client = createMockApplication();
        const data = createMockMessageComponentInteraction();
        interaction = new UpdatableInteraction(data, client, vi.fn()) as GuildInteraction<UpdatableInteraction>;
        interaction.createModal = vi.fn();
        interaction.editParent = vi.fn();

        option = new EmojiGuildSettingOption({
            name: "Emoji",
            description: "The emoji to use.",
            emojiKeys: {
                id: "emojiID",
                name: "emojiName"
            }
        });
    });

    describe("constructor", () => {
        it("should set the type to 'Emoji'", () => {
            expect(option.type).toBe(GuildSettingType.Emoji);
        });

        it("should set the 'onEdit' callback to 'handle' by default", async () => {
            const handleSpy = vi.spyOn(option, "handle").mockResolvedValue();

            await option.onEdit(option, interaction);

            expect(handleSpy).toHaveBeenCalledOnce();
            expect(handleSpy).toHaveBeenCalledWith(interaction);
        });

        it("should set the 'onView' callback to 'getValue' by default", async () => {
            const getValueSpy = vi.spyOn(option, "getValue").mockResolvedValue("👍");

            await option.onView(option, interaction);

            expect(getValueSpy).toHaveBeenCalledOnce();
            expect(getValueSpy).toHaveBeenCalledWith(interaction);
        });

        it("should set the 'idStore' key to the 'emojiKeys.id' value", () => {
            expect(option.idStore.getKey()).toBe("emojiID");
        });

        it("should set the 'nameStore' key to the 'emojiKeys.name' value", () => {
            expect(option.nameStore.getKey()).toBe("emojiName");
        });
    });

    describe("getValue", () => {
        it("should return '👍' if the name is '👍'", async () => {
            await option.idStore.set(interaction.guildID, null);
            await option.nameStore.set(interaction.guildID, "👍");

            const value = await option.getValue(interaction);
            expect(value).toBe("👍");
        });

        it("should return a custom emoji if an id exists", async () => {
            await option.idStore.set(interaction.guildID, "emoji_id");
            await option.nameStore.set(interaction.guildID, "foo");

            const value = await option.getValue(interaction);
            expect(value).toBe("<:foo:emoji_id>");
        });

        it("should return '`None`' if the value is null", async () => {
            await option.idStore.set(interaction.guildID, null);
            await option.nameStore.set(interaction.guildID, null);

            const value = await option.getValue(interaction);
            expect(value).toBe("`None`");
        });
    });

    describe("handle", () => {
        let response: ModalSubmitInteraction;

        beforeEach(async () => {
            vi.useFakeTimers().setSystemTime("01-01-2023");
            const data = createMockModalSubmitInteraction({
                components: [{
                    components: [{
                        custom_id: "emoji",
                        type: ComponentType.TextInput,
                        value: "custom"
                    }],
                    type: ComponentType.ActionRow
                }],
                custom_id: `config-emoji-${Date.now()}`
            });

            response = new ModalSubmitInteraction(data, interaction.client, vi.fn());
            response.createMessage = vi.fn();

            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(response);
            vi.spyOn(interaction.client.api.guilds, "getEmojis").mockResolvedValue([{
                id: "71272489110250160",
                name: "custom"
            }]);

            await option.idStore.set(interaction.guildID, "emoji_id");
            await option.nameStore.set(interaction.guildID, "foo");
        });

        it("should set the 'emojiName' setting to the unicode emoji", async () => {
            response.values.emoji = "😀";

            await option.handle(interaction);

            const id = await option.idStore.get(interaction.guildID);
            const name = await option.nameStore.get(interaction.guildID);

            expect(id).toBeNull();
            expect(name).toBe("😀");
        });

        it("should set the 'emojiName' setting to the unicode emoji when providing its name", async () => {
            response.values.emoji = "grinning";

            await option.handle(interaction);

            const id = await option.idStore.get(interaction.guildID);
            const name = await option.nameStore.get(interaction.guildID);

            expect(id).toBeNull();
            expect(name).toBe("😀");
        });

        it("should remove colons from the provided name", async () => {
            response.values.emoji = ":grinning:";

            await option.handle(interaction);

            const id = await option.idStore.get(interaction.guildID);
            const name = await option.nameStore.get(interaction.guildID);

            expect(id).toBeNull();
            expect(name).toBe("😀");
        });

        it("should set the 'emojiName' and 'emojiID' settings to the custom emoji", async () => {
            response.values.emoji = "<:custom:71272489110250160>";

            await option.handle(interaction);

            const id = await option.idStore.get(interaction.guildID);
            const name = await option.nameStore.get(interaction.guildID);

            expect(id).toBe("71272489110250160");
            expect(name).toBe("custom");
        });

        it("should set the 'emojiName' and 'emojiID' settings to the custom emoji when providing its name", async () => {
            response.values.emoji = "custom";

            await option.handle(interaction);

            const id = await option.idStore.get(interaction.guildID);
            const name = await option.nameStore.get(interaction.guildID);

            expect(id).toBe("71272489110250160");
            expect(name).toBe("custom");
        });

        it("should set the 'emojiName' and 'emojiID' settings to 'null' if no emoji is provided and the option is nullable", async () => {
            option.nullable = true;
            response.values.emoji = "";

            await option.handle(interaction);

            const id = await option.idStore.get(interaction.guildID);
            const name = await option.nameStore.get(interaction.guildID);

            expect(id).toBeNull();
            expect(name).toBeNull();
        });

        it("should use the current emoji as a default value if its set", async () => {
            await option.handle(interaction);

            expect(interaction.createModal).toHaveBeenCalledOnce();
            expect(interaction.createModal).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: [{
                        components: [
                            expect.objectContaining({
                                value: "foo"
                            })
                        ],
                        type: ComponentType.ActionRow
                    }]
                })
            );
        });

        it("should not use a default value if the setting is 'null'", async () => {
            option.nullable = true;
            await option.idStore.set(interaction.guildID, null);
            await option.nameStore.set(interaction.guildID, null);

            await option.handle(interaction);

            expect(interaction.createModal).toHaveBeenCalledOnce();
            expect(interaction.createModal).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: [{
                        components: [
                            expect.objectContaining({
                                value: ""
                            })
                        ],
                        type: ComponentType.ActionRow
                    }]
                })
            );
        });

        it("should send an error message if the emoji is not found", async () => {
            response.values.emoji = "unknown";

            await option.handle(interaction);

            expect(response.createMessage).toHaveBeenCalledOnce();
            expect(response.createMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining("The value you entered is not an emoji."),
                    flags: MessageFlags.Ephemeral
                })
            );
        });

        it("should throw an error if the 'emojiID' setting is not of type 'string'", async () => {
            await option.idStore.set(interaction.guildID, 10);

            await expect(() => option.handle(interaction)).rejects.toThrowError(
                "The setting 'emojiID' is not of type 'string'."
            );
        });

        it("should throw an error if the 'emojiName' setting is not of type 'string'", async () => {
            await option.nameStore.set(interaction.guildID, 10);

            await expect(() => option.handle(interaction)).rejects.toThrowError(
                "The setting 'emojiName' is not of type 'string'."
            );
        });

        it("should show a timeout message if the user does not respond", async () => {
            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(undefined);

            await option.handle(interaction);

            expect(interaction.editParent).toHaveBeenCalledOnce();
            expect(interaction.editParent).toHaveBeenCalledWith(timeoutContent);
        });
    });
});
