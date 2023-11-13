import {
    type GuildInteraction,
    MessageComponentInteraction,
    UpdatableInteraction
} from "@barry/core";

import { ChannelType, ComponentType } from "@discordjs/core";
import { ChannelGuildSettingOption } from "../../../src/config/options/ChannelGuildSettingOption.js";
import { GuildSettingType } from "../../../src/config/option.js";
import { GuildSettingsStore } from "../../../src/config/store.js";
import { createMockApplication } from "../../mocks/index.js";
import { createMockMessageComponentInteraction } from "@barry/testing";
import { timeoutContent } from "../../../src/common.js";

describe("ChannelGuildSettingOption", () => {
    let interaction: GuildInteraction<UpdatableInteraction>;
    let option: ChannelGuildSettingOption<any, any>;

    beforeEach(() => {
        const client = createMockApplication();
        const data = createMockMessageComponentInteraction();
        interaction = new UpdatableInteraction(data, client, vi.fn()) as GuildInteraction<UpdatableInteraction>;
        interaction.editParent = vi.fn();

        option = new ChannelGuildSettingOption({
            name: "Channel",
            description: "The channel to send messages in."
        });

        option.key = "channelID";
        option.store = new GuildSettingsStore();
    });

    describe("constructor", () => {
        it("should set the type to 'Channel'", () => {
            expect(option.type).toBe(GuildSettingType.Channel);
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
            await option.set(interaction.guildID, "general");

            const value = await option.getValue(interaction);
            expect(value).toBe("<#general>");
        });

        it("should return '`None`' if the value is null", async () => {
            await option.set(interaction.guildID, null);

            const value = await option.getValue(interaction);
            expect(value).toBe("`None`");
        });
    });

    describe("handle", () => {
        beforeEach(async () => {
            await option.set(interaction.guildID, "random");
        });

        it("should set the value to '#general' if the user selects '#general'", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.ChannelSelect,
                custom_id: "config-channel",
                resolved: {
                    channels: {}
                },
                values: ["general"]
            });
            const response = new MessageComponentInteraction(data, interaction.client, vi.fn());
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);

            await option.handle(interaction);

            const value = await option.get(interaction.guildID);
            expect(value).toEqual("general");
        });

        it("should set the value to null if the user selects nothing", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.ChannelSelect,
                custom_id: "config-channel",
                resolved: {
                    channels: {}
                },
                values: []
            });
            const response = new MessageComponentInteraction(data, interaction.client, vi.fn());
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);

            await option.handle(interaction);

            const value = await option.get(interaction.guildID);
            expect(value).toBeNull();
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

        it("should allow the user to select no channels if the setting is nullable", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);
            option.nullable = true;

            await option.handle(interaction);

            expect(interaction.editParent).toHaveBeenCalledTimes(2);
            expect(interaction.editParent).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: [{
                        components: [
                            expect.objectContaining({
                                min_values: 0
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

        it("should throw an error if the value is not a string", async () => {
            await option.set(interaction.guildID, ["random"]);

            await expect(option.handle(interaction)).rejects.toThrowError(
                "The setting 'channelID' is not of type 'string'."
            );
        });

        it("should not throw an error if the value is null and the setting is nullable", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

            option.nullable = true;
            await option.set(interaction.guildID, null);

            await expect(option.handle(interaction)).resolves.not.toThrowError();
        });
    });
});
