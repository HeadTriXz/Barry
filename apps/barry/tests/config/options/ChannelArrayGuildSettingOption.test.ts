import {
    type GuildInteraction,
    MessageComponentInteraction,
    UpdatableInteraction
} from "@barry/core";

import { ChannelType, ComponentType } from "@discordjs/core";
import { ChannelArrayGuildSettingOption } from "../../../src/config/options/ChannelArrayGuildSettingOption.js";
import { GuildSettingType } from "../../../src/config/option.js";
import { createMockApplication } from "../../mocks/index.js";
import { createMockMessageComponentInteraction } from "@barry/testing";
import { timeoutContent } from "../../../src/common.js";

describe("ChannelArrayGuildSettingOption", () => {
    let interaction: GuildInteraction<UpdatableInteraction>;
    let option: ChannelArrayGuildSettingOption<any, any>;

    beforeEach(() => {
        const client = createMockApplication();
        const data = createMockMessageComponentInteraction();
        interaction = new UpdatableInteraction(data, client, vi.fn()) as GuildInteraction<UpdatableInteraction>;
        interaction.editParent = vi.fn();

        option = new ChannelArrayGuildSettingOption({
            name: "Channels",
            description: "The channels to send messages in."
        });

        option.store.setKey("channels");
    });

    describe("constructor", () => {
        it("should set the type to 'ChannelArray'", () => {
            expect(option.type).toBe(GuildSettingType.ChannelArray);
        });

        it("should set the 'onEdit' callback to 'handle' by default", async () => {
            const handleSpy = vi.spyOn(option, "handle").mockResolvedValue();

            await option.onEdit(option, interaction);

            expect(handleSpy).toHaveBeenCalledOnce();
            expect(handleSpy).toHaveBeenCalledWith(interaction);
        });

        it("should set the 'onView' callback to 'getValue' by default", async () => {
            const getValueSpy = vi.spyOn(option, "getValue").mockResolvedValue("#general");

            await option.onView(option, interaction);

            expect(getValueSpy).toHaveBeenCalledOnce();
            expect(getValueSpy).toHaveBeenCalledWith(interaction);
        });
    });

    describe("getValue", () => {
        it("should return '<#general>' if the value is '#general'", async () => {
            await option.store.set(interaction.guildID, ["general"]);

            const value = await option.getValue(interaction);
            expect(value).toBe("<#general>");
        });

        it("should return '<#general>, <#random>' if the value is '#general', '#random'", async () => {
            await option.store.set(interaction.guildID, ["general", "random"]);

            const value = await option.getValue(interaction);
            expect(value).toBe("<#general>, <#random>");
        });

        it("should return '`None`' if the value is null", async () => {
            await option.store.set(interaction.guildID, null);

            const value = await option.getValue(interaction);
            expect(value).toBe("`None`");
        });
    });

    describe("handle", () => {
        beforeEach(async () => {
            await option.store.set(interaction.guildID, ["random"]);
        });

        it("should set the value to '#general' if the users selects '#general'", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.ChannelSelect,
                custom_id: "config-channels",
                resolved: {
                    channels: {}
                },
                values: ["general"]
            });
            const response = new MessageComponentInteraction(data, interaction.client, vi.fn());
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);

            await option.handle(interaction);

            const value = await option.store.get(interaction.guildID);
            expect(value).toEqual(["general"]);
        });

        it("should set the value to '#general', '#random' if the users selects '#general', '#random'", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.ChannelSelect,
                custom_id: "config-channels",
                resolved: {
                    channels: {}
                },
                values: ["general", "random"]
            });
            const response = new MessageComponentInteraction(data, interaction.client, vi.fn());
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);

            await option.handle(interaction);

            const value = await option.store.get(interaction.guildID);
            expect(value).toEqual(["general", "random"]);
        });

        it("should use the configured channel types", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);
            option.channelTypes = [ChannelType.GuildForum];

            await option.handle(interaction);

            expect(interaction.editParent).toHaveBeenCalledTimes(2);
            expect(interaction.editParent).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: [{
                        components: [
                            expect.objectContaining({
                                channel_types: [ChannelType.GuildForum]
                            })
                        ],
                        type: ComponentType.ActionRow
                    }]
                })
            );
        });

        it("should use the configured maximum", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);
            option.maximum = 5;

            await option.handle(interaction);

            expect(interaction.editParent).toHaveBeenCalledTimes(2);
            expect(interaction.editParent).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: [{
                        components: [
                            expect.objectContaining({
                                max_values: 5
                            })
                        ],
                        type: ComponentType.ActionRow
                    }]
                })
            );
        });

        it("should use the configured minimum", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);
            option.minimum = 1;

            await option.handle(interaction);

            expect(interaction.editParent).toHaveBeenCalledTimes(2);
            expect(interaction.editParent).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: [{
                        components: [
                            expect.objectContaining({
                                min_values: 1
                            })
                        ],
                        type: ComponentType.ActionRow
                    }]
                })
            );
        });

        it("should send a timeout message if the user does not respond", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

            await option.handle(interaction);

            expect(interaction.editParent).toHaveBeenCalledTimes(2);
            expect(interaction.editParent).toHaveBeenCalledWith(timeoutContent);
        });

        it("should throw an error if the value is not an array", async () => {
            await option.store.set(interaction.guildID, "random");

            await expect(option.handle(interaction)).rejects.toThrowError(
                "The setting 'channels' is not of type 'string[]'."
            );
        });

        it("should not throw an error if the value is null and the setting is nullable", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

            option.nullable = true;
            await option.store.set(interaction.guildID, null);

            await expect(option.handle(interaction)).resolves.not.toThrowError();
        });
    });
});
