import {
    type MockSettings,
    MockModule,
    MockType,
    mockSettings
} from "./mocks.js";

import {
    ChannelType,
    ComponentType,
    MessageFlags
} from "@discordjs/core";
import {
    MessageComponentInteraction,
    ModalSubmitInteraction,
    UpdatableInteraction
} from "@barry/core";
import {
    createMockMessageComponentInteraction,
    createMockModalSubmitInteraction,
    mockChannel,
    mockRole
} from "@barry/testing";

import { GuildSettingType } from "../../../../../../src/ConfigurableModule.js";
import { ModifyGuildSettingHandlers } from "../../../../../../src/modules/general/commands/chatinput/config/handlers.js";
import { createMockApplication } from "../../../../../mocks/application.js";
import { timeoutContent } from "../../../../../../src/common.js";

describe("ModifyGuildSettingHandlers", () => {
    let handlers: ModifyGuildSettingHandlers<MockModule, MockSettings>;
    let interaction: UpdatableInteraction;
    let module: MockModule;
    let settings: MockSettings;

    beforeEach(() => {
        const client = createMockApplication();
        module = new MockModule(client);
        handlers = new ModifyGuildSettingHandlers(module);

        const data = createMockMessageComponentInteraction();
        interaction = new UpdatableInteraction(data, client, vi.fn());
        interaction.createModal = vi.fn();
        interaction.editParent = vi.fn();

        settings = { ...mockSettings };
    });

    describe("boolean", () => {
        it("should set the setting to true if the old value is false", async () => {
            settings.enabled = false;

            await handlers.boolean(settings, {
                description: "Hello World!",
                key: "enabled",
                name: "Enabled",
                repository: module.settings,
                type: GuildSettingType.Boolean
            });

            expect(settings.enabled).toBe(true);
        });

        it("should set the setting to false if the old value is true", async () => {
            settings.enabled = true;

            await handlers.boolean(settings, {
                description: "Hello World!",
                key: "enabled",
                name: "Enabled",
                repository: module.settings,
                type: GuildSettingType.Boolean
            });

            expect(settings.enabled).toBe(false);
        });

        it("should throw an error if the setting is not of type 'boolean'", async () => {
            await expect(() => handlers.boolean(settings, {
                description: "Hello World!",
                key: "channelID",
                name: "Channel",
                repository: module.settings,
                type: GuildSettingType.Boolean
            })).rejects.toThrowError("The setting 'channelID' is not of type 'boolean'.");
        });

        it("should not throw an error if the setting is nullable", async () => {
            settings.enabled = null as unknown as boolean;

            await handlers.boolean(settings, {
                description: "Hello World!",
                key: "enabled",
                name: "Enabled",
                nullable: true,
                repository: module.settings,
                type: GuildSettingType.Boolean
            });

            expect(settings.enabled).toBe(true);
        });
    });

    describe("channel", () => {
        let response: MessageComponentInteraction;

        beforeEach(() => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.ChannelSelect,
                custom_id: "config-channel",
                resolved: {
                    channels: {
                        [mockChannel.id]: { ...mockChannel, permissions: "0" }
                    }
                },
                values: [mockChannel.id]
            });
            response = new MessageComponentInteraction(data, module.client, vi.fn());

            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
        });

        it("should set the setting to the channel ID", async () => {
            await handlers.channel(interaction, settings, {
                description: "Hello World!",
                key: "channelID",
                name: "Channel",
                repository: module.settings,
                type: GuildSettingType.Channel
            });

            expect(settings.channelID).toBe("30527482987641765");
        });

        it("should use custom channel types if specified", async () => {
            await handlers.channel(interaction, settings, {
                channelTypes: [ChannelType.GuildForum],
                description: "Hello World!",
                key: "channelID",
                name: "Channel",
                repository: module.settings,
                type: GuildSettingType.Channel
            });

            expect(interaction.editParent).toHaveBeenCalledOnce();
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

        it("should use the current channel as a default value if its set", async () => {
            await handlers.channel(interaction, settings, {
                description: "Hello World!",
                key: "channelID",
                name: "Channel",
                repository: module.settings,
                type: GuildSettingType.Channel
            });

            expect(interaction.editParent).toHaveBeenCalledOnce();
            expect(interaction.editParent).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: [{
                        components: [
                            expect.objectContaining({
                                default_values: [{
                                    id: "30527482987641760",
                                    type: "channel"
                                }]
                            })
                        ],
                        type: ComponentType.ActionRow
                    }]
                })
            );
        });

        it("should have no default value if the setting is 'null'", async () => {
            settings.channelID = null as unknown as string;

            await handlers.channel(interaction, settings, {
                description: "Hello World!",
                key: "channelID",
                name: "Channel",
                nullable: true,
                repository: module.settings,
                type: GuildSettingType.Channel
            });

            expect(interaction.editParent).toHaveBeenCalledOnce();
            expect(interaction.editParent).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: [{
                        components: [
                            expect.objectContaining({
                                default_values: undefined
                            })
                        ],
                        type: ComponentType.ActionRow
                    }]
                })
            );
        });

        it("should allow no value if the setting is nullable", async () => {
            if (!response.data.isChannelSelect()) {
                return expect.unreachable("The interaction is not a channel select.");
            }

            response.data.values = [];

            await handlers.channel(interaction, settings, {
                description: "Hello World!",
                key: "channelID",
                name: "Channel",
                nullable: true,
                repository: module.settings,
                type: GuildSettingType.Channel
            });

            expect(interaction.editParent).toHaveBeenCalledOnce();
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

        it("should throw an error if the setting is not of type 'string'", async () => {
            await expect(() => handlers.channel(interaction, settings, {
                description: "Hello World!",
                key: "enabled",
                name: "Enabled",
                repository: module.settings,
                type: GuildSettingType.Channel
            })).rejects.toThrowError("The setting 'enabled' is not of type 'string'.");
        });

        it("should show a timeout message if the user does not respond", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

            await handlers.channel(interaction, settings, {
                description: "Hello World!",
                key: "channelID",
                name: "Channel",
                repository: module.settings,
                type: GuildSettingType.Channel
            });

            expect(interaction.editParent).toHaveBeenCalledTimes(2);
            expect(interaction.editParent).toHaveBeenCalledWith(timeoutContent);
        });
    });

    describe("channelArray", () => {
        beforeEach(() => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.ChannelSelect,
                custom_id: "config-channels",
                resolved: {
                    channels: {
                        [mockChannel.id]: { ...mockChannel, permissions: "0" }
                    }
                },
                values: [mockChannel.id]
            });
            const response = new MessageComponentInteraction(data, module.client, vi.fn());

            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
        });

        it("should set the setting to the channel IDs", async () => {
            await handlers.channelArray(interaction, settings, {
                description: "Hello World!",
                key: "channels",
                name: "Channels",
                repository: module.settings,
                type: GuildSettingType.ChannelArray
            });

            expect(settings.channels).toEqual(["30527482987641765"]);
        });

        it("should use custom channel types if specified", async () => {
            await handlers.channelArray(interaction, settings, {
                channelTypes: [ChannelType.GuildForum],
                description: "Hello World!",
                key: "channels",
                name: "Channels",
                repository: module.settings,
                type: GuildSettingType.ChannelArray
            });

            expect(interaction.editParent).toHaveBeenCalledOnce();
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

        it("should use the current channels as a default value if its set", async () => {
            await handlers.channelArray(interaction, settings, {
                description: "Hello World!",
                key: "channels",
                name: "Channels",
                repository: module.settings,
                type: GuildSettingType.ChannelArray
            });

            expect(interaction.editParent).toHaveBeenCalledOnce();
            expect(interaction.editParent).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: [{
                        components: [
                            expect.objectContaining({
                                default_values: [{
                                    id: "30527482987641760",
                                    type: "channel"
                                }]
                            })
                        ],
                        type: ComponentType.ActionRow
                    }]
                })
            );
        });

        it("should use a custom 'max_values' if specified", async () => {
            await handlers.channelArray(interaction, settings, {
                description: "Hello World!",
                key: "channels",
                maximum: 5,
                name: "Channels",
                repository: module.settings,
                type: GuildSettingType.ChannelArray
            });

            expect(interaction.editParent).toHaveBeenCalledOnce();
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

        it("should use a custom 'min_values' if specified", async () => {
            await handlers.channelArray(interaction, settings, {
                description: "Hello World!",
                key: "channels",
                minimum: 5,
                name: "Channels",
                repository: module.settings,
                type: GuildSettingType.ChannelArray
            });

            expect(interaction.editParent).toHaveBeenCalledOnce();
            expect(interaction.editParent).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: [{
                        components: [
                            expect.objectContaining({
                                min_values: 5
                            })
                        ],
                        type: ComponentType.ActionRow
                    }]
                })
            );
        });

        it("should throw an error if the setting is not of type 'string[]'", async () => {
            await expect(() => handlers.channelArray(interaction, settings, {
                description: "Hello World!",
                key: "enabled",
                name: "Enabled",
                repository: module.settings,
                type: GuildSettingType.ChannelArray
            })).rejects.toThrowError("The setting 'enabled' is not of type 'string[]'.");
        });

        it("should not throw an error if the setting is nullable", async () => {
            settings.channels = null as unknown as string[];

            await handlers.channelArray(interaction, settings, {
                description: "Hello World!",
                key: "channels",
                name: "Channels",
                nullable: true,
                repository: module.settings,
                type: GuildSettingType.ChannelArray
            });

            expect(settings.channels).toEqual([mockChannel.id]);
        });

        it("should show a timeout message if the user does not respond", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

            await handlers.channelArray(interaction, settings, {
                description: "Hello World!",
                key: "channels",
                name: "Channels",
                repository: module.settings,
                type: GuildSettingType.ChannelArray
            });

            expect(interaction.editParent).toHaveBeenCalledTimes(2);
            expect(interaction.editParent).toHaveBeenCalledWith(timeoutContent);
        });
    });

    describe("emoji", () => {
        let response: ModalSubmitInteraction;

        beforeEach(() => {
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

            response = new ModalSubmitInteraction(data, module.client, vi.fn());
            response.createMessage = vi.fn();

            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(response);
            vi.spyOn(module.client.api.guilds, "getEmojis").mockResolvedValue([{
                id: "71272489110250160",
                name: "custom"
            }]);
        });

        it("should set the 'emojiName' setting to the unicode emoji", async () => {
            response.values.emoji = "😀";

            await handlers.emoji(interaction, settings, {
                description: "Hello World!",
                emojiKeys: {
                    id: "emojiID",
                    name: "emojiName"
                },
                key: "emojiName",
                name: "Emoji",
                repository: module.settings,
                type: GuildSettingType.Emoji
            });

            expect(settings.emojiName).toBe("😀");
        });

        it("should set the 'emojiName' setting to the unicode emoji when providing its name", async () => {
            response.values.emoji = "grinning";

            await handlers.emoji(interaction, settings, {
                description: "Hello World!",
                emojiKeys: {
                    id: "emojiID",
                    name: "emojiName"
                },
                key: "emojiName",
                name: "Emoji",
                repository: module.settings,
                type: GuildSettingType.Emoji
            });

            expect(settings.emojiName).toBe("😀");
        });

        it("should remove colons from the provided name", async () => {
            response.values.emoji = ":grinning:";

            await handlers.emoji(interaction, settings, {
                description: "Hello World!",
                emojiKeys: {
                    id: "emojiID",
                    name: "emojiName"
                },
                key: "emojiName",
                name: "Emoji",
                repository: module.settings,
                type: GuildSettingType.Emoji
            });

            expect(settings.emojiName).toBe("😀");
        });

        it("should set the 'emojiName' and 'emojiID' settings to the custom emoji", async () => {
            response.values.emoji = "<:custom:71272489110250160>";

            await handlers.emoji(interaction, settings, {
                description: "Hello World!",
                emojiKeys: {
                    id: "emojiID",
                    name: "emojiName"
                },
                key: "emojiName",
                name: "Emoji",
                repository: module.settings,
                type: GuildSettingType.Emoji
            });

            expect(settings.emojiName).toBe("custom");
            expect(settings.emojiID).toBe("71272489110250160");
        });

        it("should set the 'emojiName' and 'emojiID' settings to the custom emoji when providing its name", async () => {
            response.values.emoji = "custom";

            await handlers.emoji(interaction, settings, {
                description: "Hello World!",
                emojiKeys: {
                    id: "emojiID",
                    name: "emojiName"
                },
                key: "emojiName",
                name: "Emoji",
                repository: module.settings,
                type: GuildSettingType.Emoji
            });

            expect(settings.emojiName).toBe("custom");
            expect(settings.emojiID).toBe("71272489110250160");
        });

        it("should set the 'emojiName' and 'emojiID' settings to 'null' if no emoji is provided and the option is nullable", async () => {
            response.values.emoji = "";

            await handlers.emoji(interaction, settings, {
                description: "Hello World!",
                emojiKeys: {
                    id: "emojiID",
                    name: "emojiName"
                },
                key: "emojiName",
                name: "Emoji",
                nullable: true,
                repository: module.settings,
                type: GuildSettingType.Emoji
            });

            expect(settings.emojiName).toBeNull();
            expect(settings.emojiID).toBeNull();
        });

        it("should use the current emoji as a default value if its set", async () => {
            await handlers.emoji(interaction, settings, {
                description: "Hello World!",
                emojiKeys: {
                    id: "emojiID",
                    name: "emojiName"
                },
                key: "emojiName",
                name: "Emoji",
                repository: module.settings,
                type: GuildSettingType.Emoji
            });

            expect(interaction.createModal).toHaveBeenCalledOnce();
            expect(interaction.createModal).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: [{
                        components: [
                            expect.objectContaining({
                                value: "mock"
                            })
                        ],
                        type: ComponentType.ActionRow
                    }]
                })
            );
        });

        it("should not use a default value if the setting is 'null'", async () => {
            settings.emojiName = null as unknown as string;

            await handlers.emoji(interaction, settings, {
                description: "Hello World!",
                emojiKeys: {
                    id: "emojiID",
                    name: "emojiName"
                },
                key: "emojiName",
                name: "Emoji",
                nullable: true,
                repository: module.settings,
                type: GuildSettingType.Emoji
            });

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

            await handlers.emoji(interaction, settings, {
                description: "Hello World!",
                emojiKeys: {
                    id: "emojiID",
                    name: "emojiName"
                },
                key: "emojiName",
                name: "Emoji",
                repository: module.settings,
                type: GuildSettingType.Emoji
            });

            expect(response.createMessage).toHaveBeenCalledOnce();
            expect(response.createMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining("The value you entered is not an emoji."),
                    flags: MessageFlags.Ephemeral
                })
            );
        });

        it("should throw an error if the 'emojiID' setting is not of type 'string'", async () => {
            await expect(() => handlers.emoji(interaction, settings, {
                description: "Hello World!",
                emojiKeys: {
                    id: "enabled",
                    name: "emojiName"
                },
                key: "emojiName",
                name: "Emoji",
                repository: module.settings,
                type: GuildSettingType.Emoji
            })).rejects.toThrowError("The setting 'enabled' is not of type 'string'.");
        });

        it("should throw an error if the 'emojiName' setting is not of type 'string'", async () => {
            await expect(() => handlers.emoji(interaction, settings, {
                description: "Hello World!",
                emojiKeys: {
                    id: "emojiID",
                    name: "enabled"
                },
                key: "emojiName",
                name: "Emoji",
                repository: module.settings,
                type: GuildSettingType.Emoji
            })).rejects.toThrowError("The setting 'enabled' is not of type 'string'.");
        });

        it("should not throw an error if the 'emojiName' setting is nullable", async () => {
            settings.emojiName = null as unknown as string;

            await handlers.emoji(interaction, settings, {
                description: "Hello World!",
                emojiKeys: {
                    id: "emojiID",
                    name: "emojiName"
                },
                key: "emojiName",
                name: "Emoji",
                nullable: true,
                repository: module.settings,
                type: GuildSettingType.Emoji
            });

            expect(settings.emojiName).toBe("custom");
            expect(settings.emojiID).toBe("71272489110250160");
        });

        it("should show a timeout message if the user does not respond", async () => {
            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(undefined);

            await handlers.emoji(interaction, settings, {
                description: "Hello World!",
                emojiKeys: {
                    id: "emojiID",
                    name: "emojiName"
                },
                key: "emojiName",
                name: "Emoji",
                repository: module.settings,
                type: GuildSettingType.Emoji
            });

            expect(interaction.editParent).toHaveBeenCalledOnce();
            expect(interaction.editParent).toHaveBeenCalledWith(timeoutContent);
        });
    });

    describe("enum", () => {
        let response: MessageComponentInteraction;

        beforeEach(() => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "config-enum",
                values: ["Bar"]
            });
            response = new MessageComponentInteraction(data, module.client, vi.fn());

            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
        });

        it("should set the setting to the enum value", async () => {
            await handlers.enum(interaction, settings, {
                description: "Hello World!",
                key: "type",
                name: "Type",
                repository: module.settings,
                type: GuildSettingType.Enum,
                values: ["Foo", "Bar", "Baz"]
            });

            expect(settings.type).toBe(MockType.Bar);
        });

        it("should use the current value as a default value if its set", async () => {
            await handlers.enum(interaction, settings, {
                description: "Hello World!",
                key: "type",
                name: "Type",
                repository: module.settings,
                type: GuildSettingType.Enum,
                values: ["Foo", "Bar", "Baz"]
            });

            expect(interaction.editParent).toHaveBeenCalledOnce();
            expect(interaction.editParent).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: [{
                        components: [
                            expect.objectContaining({
                                options: expect.arrayContaining([{
                                    default: true,
                                    label: "Foo",
                                    value: "Foo"
                                }])
                            })
                        ],
                        type: ComponentType.ActionRow
                    }]
                })
            );
        });

        it("should allow no value if the setting is nullable", async () => {
            if (!response.data.isStringSelect()) {
                return expect.unreachable("The interaction is not a string select.");
            }

            response.data.values = [];

            await handlers.enum(interaction, settings, {
                description: "Hello World!",
                key: "type",
                name: "Type",
                nullable: true,
                repository: module.settings,
                type: GuildSettingType.Enum,
                values: ["Foo", "Bar", "Baz"]
            });

            expect(interaction.editParent).toHaveBeenCalledOnce();
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

        it("should throw an error if the setting is not of type 'string'", async () => {
            await expect(() => handlers.enum(interaction, settings, {
                description: "Hello World!",
                key: "enabled",
                name: "Enabled",
                repository: module.settings,
                type: GuildSettingType.Enum,
                values: ["Foo", "Bar", "Baz"]
            })).rejects.toThrowError("The setting 'enabled' is not of type 'string'.");
        });

        it("should not throw an error if the setting is nullable", async () => {
            settings.type = null as unknown as MockType;

            await handlers.enum(interaction, settings, {
                description: "Hello World!",
                key: "type",
                name: "Type",
                nullable: true,
                repository: module.settings,
                type: GuildSettingType.Enum,
                values: ["Foo", "Bar", "Baz"]
            });

            expect(settings.type).toBe(MockType.Bar);
        });

        it("should show a timeout message if the user does not respond", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

            await handlers.enum(interaction, settings, {
                description: "Hello World!",
                key: "type",
                name: "Type",
                repository: module.settings,
                type: GuildSettingType.Enum,
                values: ["Foo", "Bar", "Baz"]
            });

            expect(interaction.editParent).toHaveBeenCalledTimes(2);
            expect(interaction.editParent).toHaveBeenCalledWith(timeoutContent);
        });
    });

    describe("float", () => {
        let response: ModalSubmitInteraction;

        beforeEach(() => {
            const data = createMockModalSubmitInteraction({
                components: [{
                    components: [{
                        custom_id: "float",
                        type: ComponentType.TextInput,
                        value: "5.5"
                    }],
                    type: ComponentType.ActionRow
                }],
                custom_id: `config-float-${Date.now()}`
            });
            response = new ModalSubmitInteraction(data, module.client, vi.fn());
            response.createMessage = vi.fn();

            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(response);
        });

        it("should set the setting to the float value", async () => {
            await handlers.float(interaction, settings, {
                description: "Hello World!",
                key: "max",
                name: "Maximum",
                repository: module.settings,
                type: GuildSettingType.Float
            });

            expect(settings.max).toBe(5.5);
        });

        it("should set the setting to the float value when providing an integer", async () => {
            response.values.float = "5";

            await handlers.float(interaction, settings, {
                description: "Hello World!",
                key: "max",
                name: "Maximum",
                repository: module.settings,
                type: GuildSettingType.Float
            });

            expect(settings.max).toBe(5.0);
        });

        it("should use the current value as a default value if its set", async () => {
            await handlers.float(interaction, settings, {
                description: "Hello World!",
                key: "max",
                name: "Maximum",
                repository: module.settings,
                type: GuildSettingType.Float
            });

            expect(interaction.createModal).toHaveBeenCalledOnce();
            expect(interaction.createModal).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: [{
                        components: [
                            expect.objectContaining({
                                value: "10"
                            })
                        ],
                        type: ComponentType.ActionRow
                    }]
                })
            );
        });

        it("should not use a default value if the setting is 'null'", async () => {
            settings.max = null as unknown as number;

            await handlers.float(interaction, settings, {
                description: "Hello World!",
                key: "max",
                name: "Maximum",
                nullable: true,
                repository: module.settings,
                type: GuildSettingType.Float
            });

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

        it("should set the setting to 'null' if no value is provided and the option is nullable", async () => {
            response.values.float = "";

            await handlers.float(interaction, settings, {
                description: "Hello World!",
                key: "max",
                name: "Maximum",
                nullable: true,
                repository: module.settings,
                type: GuildSettingType.Float
            });

            expect(settings.max).toBeNull();
        });

        it("should send an error message if no value is provided and the option is not nullable", async () => {
            response.values.float = "";

            await handlers.float(interaction, settings, {
                description: "Hello World!",
                key: "max",
                name: "Maximum",
                repository: module.settings,
                type: GuildSettingType.Float
            });

            expect(response.createMessage).toHaveBeenCalledOnce();
            expect(response.createMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining("The value you entered is not a float."),
                    flags: MessageFlags.Ephemeral
                })
            );
        });

        it("should send an error message if the value is not a float", async () => {
            response.values.float = "foo";

            await handlers.float(interaction, settings, {
                description: "Hello World!",
                key: "max",
                name: "Maximum",
                repository: module.settings,
                type: GuildSettingType.Float
            });

            expect(response.createMessage).toHaveBeenCalledOnce();
            expect(response.createMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining("The value you entered is not a float."),
                    flags: MessageFlags.Ephemeral
                })
            );
        });

        it("should send an error message if the value is less than the minimum", async () => {
            response.values.float = "-1";

            await handlers.float(interaction, settings, {
                description: "Hello World!",
                key: "max",
                minimum: 0,
                name: "Maximum",
                repository: module.settings,
                type: GuildSettingType.Float
            });

            expect(response.createMessage).toHaveBeenCalledOnce();
            expect(response.createMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining("The value you entered is too small."),
                    flags: MessageFlags.Ephemeral
                })
            );
        });

        it("should send an error message if the value is greater than the maximum", async () => {
            response.values.float = "11";

            await handlers.float(interaction, settings, {
                description: "Hello World!",
                key: "max",
                maximum: 10,
                name: "Maximum",
                repository: module.settings,
                type: GuildSettingType.Float
            });

            expect(response.createMessage).toHaveBeenCalledOnce();
            expect(response.createMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining("The value you entered is too large."),
                    flags: MessageFlags.Ephemeral
                })
            );
        });

        it("should throw an error if the setting is not of type 'number'", async () => {
            await expect(() => handlers.float(interaction, settings, {
                description: "Hello World!",
                key: "enabled",
                name: "Enabled",
                repository: module.settings,
                type: GuildSettingType.Float
            })).rejects.toThrowError("The setting 'enabled' is not of type 'number'.");
        });

        it("should not throw an error if the setting is nullable", async () => {
            settings.max = null as unknown as number;

            await handlers.float(interaction, settings, {
                description: "Hello World!",
                key: "max",
                name: "Maximum",
                nullable: true,
                repository: module.settings,
                type: GuildSettingType.Float
            });

            expect(settings.max).toBe(5.5);
        });

        it("should show a timeout message if the user does not respond", async () => {
            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(undefined);

            await handlers.float(interaction, settings, {
                description: "Hello World!",
                key: "max",
                name: "Maximum",
                repository: module.settings,
                type: GuildSettingType.Float
            });

            expect(interaction.editParent).toHaveBeenCalledOnce();
            expect(interaction.editParent).toHaveBeenCalledWith(timeoutContent);
        });
    });

    describe("handle", () => {
        it("should call the boolean handler if the setting is of type 'Boolean'", async () => {
            handlers.boolean = vi.fn();

            await handlers.handle(interaction, settings, {
                description: "Hello World!",
                key: "enabled",
                name: "Enabled",
                repository: module.settings,
                type: GuildSettingType.Boolean
            });

            expect(handlers.boolean).toHaveBeenCalledOnce();
        });

        it("should call the channel handler if the setting is of type 'Channel'", async () => {
            handlers.channel = vi.fn();

            await handlers.handle(interaction, settings, {
                description: "Hello World!",
                key: "channelID",
                name: "Channel",
                repository: module.settings,
                type: GuildSettingType.Channel
            });

            expect(handlers.channel).toHaveBeenCalledOnce();
        });

        it("should call the channelArray handler if the setting is of type 'ChannelArray'", async () => {
            handlers.channelArray = vi.fn();

            await handlers.handle(interaction, settings, {
                description: "Hello World!",
                key: "channels",
                name: "Channels",
                repository: module.settings,
                type: GuildSettingType.ChannelArray
            });

            expect(handlers.channelArray).toHaveBeenCalledOnce();
        });

        it("should call the callback if the setting is of type 'Custom'", async () => {
            const callback = vi.fn();

            await handlers.handle(interaction, settings, {
                callback: callback,
                description: "Hello World!",
                key: "random",
                name: "Random",
                repository: module.settings,
                type: GuildSettingType.Custom
            });

            expect(callback).toHaveBeenCalledOnce();
            expect(callback).toHaveBeenCalledWith(interaction, settings, expect.any(Function));
        });

        it("should provide the base handler if the setting is of type 'Custom'", async () => {
            const callback = vi.fn();

            await handlers.handle(interaction, settings, {
                base: GuildSettingType.String,
                callback: callback,
                description: "Hello World!",
                key: "random",
                name: "Random",
                repository: module.settings,
                type: GuildSettingType.Custom
            });

            expect(callback).toHaveBeenCalledOnce();
            expect(callback).toHaveBeenCalledWith(interaction, settings, expect.any(Function));
        });

        it("should call the emoji handler if the setting is of type 'Emoji'", async () => {
            handlers.emoji = vi.fn();

            await handlers.handle(interaction, settings, {
                description: "Hello World!",
                emojiKeys: {
                    id: "emojiID",
                    name: "emojiName"
                },
                key: "emojiName",
                name: "Emoji",
                repository: module.settings,
                type: GuildSettingType.Emoji
            });

            expect(handlers.emoji).toHaveBeenCalledOnce();
        });

        it("should call the enum handler if the setting is of type 'Enum'", async () => {
            handlers.enum = vi.fn();

            await handlers.handle(interaction, settings, {
                description: "Hello World!",
                key: "type",
                name: "Type",
                repository: module.settings,
                type: GuildSettingType.Enum,
                values: ["Foo", "Bar", "Baz"]
            });

            expect(handlers.enum).toHaveBeenCalledOnce();
        });

        it("should call the float handler if the setting is of type 'Float'", async () => {
            handlers.float = vi.fn();

            await handlers.handle(interaction, settings, {
                description: "Hello World!",
                key: "max",
                name: "Maximum",
                repository: module.settings,
                type: GuildSettingType.Float
            });

            expect(handlers.float).toHaveBeenCalledOnce();
        });

        it("should call the integer handler if the setting is of type 'Integer'", async () => {
            handlers.integer = vi.fn();

            await handlers.handle(interaction, settings, {
                description: "Hello World!",
                key: "min",
                name: "Minimum",
                repository: module.settings,
                type: GuildSettingType.Integer
            });

            expect(handlers.integer).toHaveBeenCalledOnce();
        });

        it("should call the role handler if the setting is of type 'Role'", async () => {
            handlers.role = vi.fn();

            await handlers.handle(interaction, settings, {
                description: "Hello World!",
                key: "roleID",
                name: "Role",
                repository: module.settings,
                type: GuildSettingType.Role
            });

            expect(handlers.role).toHaveBeenCalledOnce();
        });

        it("should call the roleArray handler if the setting is of type 'RoleArray'", async () => {
            handlers.roleArray = vi.fn();

            await handlers.handle(interaction, settings, {
                description: "Hello World!",
                key: "roles",
                name: "Roles",
                repository: module.settings,
                type: GuildSettingType.RoleArray
            });

            expect(handlers.roleArray).toHaveBeenCalledOnce();
        });

        it("should call the string handler if the setting is of type 'String'", async () => {
            handlers.string = vi.fn();

            await handlers.handle(interaction, settings, {
                description: "Hello World!",
                key: "text",
                name: "Text",
                repository: module.settings,
                type: GuildSettingType.String
            });

            expect(handlers.string).toHaveBeenCalledOnce();
        });
    });

    describe("integer", () => {
        let response: ModalSubmitInteraction;

        beforeEach(() => {
            const data = createMockModalSubmitInteraction({
                components: [{
                    components: [{
                        custom_id: "integer",
                        type: ComponentType.TextInput,
                        value: "5"
                    }],
                    type: ComponentType.ActionRow
                }],
                custom_id: `config-integer-${Date.now()}`
            });
            response = new ModalSubmitInteraction(data, module.client, vi.fn());
            response.createMessage = vi.fn();

            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(response);
        });

        it("should set the setting to the integer value", async () => {
            await handlers.integer(interaction, settings, {
                description: "Hello World!",
                key: "min",
                name: "Minimum",
                repository: module.settings,
                type: GuildSettingType.Integer
            });

            expect(settings.min).toBe(5);
        });

        it("should set the setting to 'null' if no value is provided and the option is nullable", async () => {
            response.values.integer = "";

            await handlers.integer(interaction, settings, {
                description: "Hello World!",
                key: "min",
                name: "Minimum",
                nullable: true,
                repository: module.settings,
                type: GuildSettingType.Integer
            });

            expect(settings.min).toBeNull();
        });

        it("should use the current value as a default value if its set", async () => {
            await handlers.integer(interaction, settings, {
                description: "Hello World!",
                key: "min",
                name: "Minimum",
                repository: module.settings,
                type: GuildSettingType.Integer
            });

            expect(interaction.createModal).toHaveBeenCalledOnce();
            expect(interaction.createModal).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: [{
                        components: [
                            expect.objectContaining({
                                value: "0"
                            })
                        ],
                        type: ComponentType.ActionRow
                    }]
                })
            );
        });

        it("should not use a default value if the setting is 'null'", async () => {
            settings.min = null as unknown as number;

            await handlers.integer(interaction, settings, {
                description: "Hello World!",
                key: "min",
                name: "Minimum",
                nullable: true,
                repository: module.settings,
                type: GuildSettingType.Integer
            });

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

        it("should send an error message if no value is provided and the option is not nullable", async () => {
            response.values.integer = "";

            await handlers.integer(interaction, settings, {
                description: "Hello World!",
                key: "min",
                name: "Minimum",
                repository: module.settings,
                type: GuildSettingType.Integer
            });

            expect(response.createMessage).toHaveBeenCalledOnce();
            expect(response.createMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining("The value you entered is not an integer."),
                    flags: MessageFlags.Ephemeral
                })
            );
        });

        it("should send an error message if the value is not a integer", async () => {
            response.values.integer = "foo";

            await handlers.integer(interaction, settings, {
                description: "Hello World!",
                key: "min",
                name: "Minimum",
                repository: module.settings,
                type: GuildSettingType.Integer
            });

            expect(response.createMessage).toHaveBeenCalledOnce();
            expect(response.createMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining("The value you entered is not an integer."),
                    flags: MessageFlags.Ephemeral
                })
            );
        });

        it("should send an error message if the value is less than the minimum", async () => {
            response.values.integer = "-1";

            await handlers.integer(interaction, settings, {
                description: "Hello World!",
                key: "min",
                minimum: 0,
                name: "Minimum",
                repository: module.settings,
                type: GuildSettingType.Integer
            });

            expect(response.createMessage).toHaveBeenCalledOnce();
            expect(response.createMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining("The value you entered is too small."),
                    flags: MessageFlags.Ephemeral
                })
            );
        });

        it("should send an error message if the value is greater than the maximum", async () => {
            response.values.integer = "11";

            await handlers.integer(interaction, settings, {
                description: "Hello World!",
                key: "min",
                maximum: 10,
                name: "Minimum",
                repository: module.settings,
                type: GuildSettingType.Integer
            });

            expect(response.createMessage).toHaveBeenCalledOnce();
            expect(response.createMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining("The value you entered is too large."),
                    flags: MessageFlags.Ephemeral
                })
            );
        });

        it("should throw an error if the setting is not of type 'number'", async () => {
            await expect(() => handlers.integer(interaction, settings, {
                description: "Hello World!",
                key: "enabled",
                name: "Enabled",
                repository: module.settings,
                type: GuildSettingType.Integer
            })).rejects.toThrowError("The setting 'enabled' is not of type 'number'.");
        });

        it("should not throw an error if the setting is nullable", async () => {
            settings.min = null as unknown as number;

            await handlers.integer(interaction, settings, {
                description: "Hello World!",
                key: "min",
                name: "Minimum",
                nullable: true,
                repository: module.settings,
                type: GuildSettingType.Integer
            });

            expect(settings.min).toBe(5);
        });

        it("should show a timeout message if the user does not respond", async () => {
            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(undefined);

            await handlers.integer(interaction, settings, {
                description: "Hello World!",
                key: "min",
                name: "Minimum",
                repository: module.settings,
                type: GuildSettingType.Integer
            });

            expect(interaction.editParent).toHaveBeenCalledOnce();
            expect(interaction.editParent).toHaveBeenCalledWith(timeoutContent);
        });
    });

    describe("role", () => {
        let response: MessageComponentInteraction;

        beforeEach(() => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.RoleSelect,
                custom_id: "config-role",
                resolved: {
                    roles: { [mockRole.id]: mockRole }
                },
                values: [mockRole.id]
            });
            response = new MessageComponentInteraction(data, module.client, vi.fn());

            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
        });

        it("should set the setting to the role ID", async () => {
            await handlers.role(interaction, settings, {
                description: "Hello World!",
                key: "roleID",
                name: "Role",
                repository: module.settings,
                type: GuildSettingType.Role
            });

            expect(settings.roleID).toBe("68239102456844360");
        });

        it("should use the current role as a default value if its set", async () => {
            await handlers.role(interaction, settings, {
                description: "Hello World!",
                key: "roleID",
                name: "Role",
                repository: module.settings,
                type: GuildSettingType.Role
            });

            expect(interaction.editParent).toHaveBeenCalledOnce();
            expect(interaction.editParent).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: [{
                        components: [
                            expect.objectContaining({
                                default_values: [{
                                    id: "68239102456844365",
                                    type: "role"
                                }]
                            })
                        ],
                        type: ComponentType.ActionRow
                    }]
                })
            );
        });

        it("should not use a default value if the setting is 'null'", async () => {
            settings.roleID = null as unknown as string;

            await handlers.role(interaction, settings, {
                description: "Hello World!",
                key: "roleID",
                name: "Role",
                nullable: true,
                repository: module.settings,
                type: GuildSettingType.Role
            });

            expect(interaction.editParent).toHaveBeenCalledOnce();
            expect(interaction.editParent).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: [{
                        components: [
                            expect.objectContaining({
                                default_values: undefined
                            })
                        ],
                        type: ComponentType.ActionRow
                    }]
                })
            );
        });

        it("should allow no value if the setting is nullable", async () => {
            await handlers.role(interaction, settings, {
                description: "Hello World!",
                key: "roleID",
                name: "Role",
                nullable: true,
                repository: module.settings,
                type: GuildSettingType.Role
            });

            expect(interaction.editParent).toHaveBeenCalledOnce();
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

        it("should set the setting to 'null' if no value is provided and the option is nullable", async () => {
            if (!response.data.isRoleSelect()) {
                return expect.unreachable("The interaction is not a role select.");
            }

            response.data.values = [];

            await handlers.role(interaction, settings, {
                description: "Hello World!",
                key: "roleID",
                name: "Role",
                nullable: true,
                repository: module.settings,
                type: GuildSettingType.Role
            });

            expect(settings.roleID).toBeNull();
        });

        it("should throw an error if the setting is not of type 'string'", async () => {
            await expect(() => handlers.role(interaction, settings, {
                description: "Hello World!",
                key: "enabled",
                name: "Enabled",
                repository: module.settings,
                type: GuildSettingType.Role
            })).rejects.toThrowError("The setting 'enabled' is not of type 'string'.");
        });

        it("should show a timeout message if the user does not respond", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

            await handlers.role(interaction, settings, {
                description: "Hello World!",
                key: "roleID",
                name: "Role",
                repository: module.settings,
                type: GuildSettingType.Role
            });

            expect(interaction.editParent).toHaveBeenCalledTimes(2);
            expect(interaction.editParent).toHaveBeenCalledWith(timeoutContent);
        });
    });

    describe("roleArray", () => {
        beforeEach(() => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.RoleSelect,
                custom_id: "config-roles",
                resolved: {
                    roles: { [mockRole.id]: mockRole }
                },
                values: [mockRole.id]
            });
            const response = new MessageComponentInteraction(data, module.client, vi.fn());

            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
        });

        it("should set the setting to the role IDs", async () => {
            await handlers.roleArray(interaction, settings, {
                description: "Hello World!",
                key: "roles",
                name: "Roles",
                repository: module.settings,
                type: GuildSettingType.RoleArray
            });

            expect(settings.roles).toEqual(["68239102456844360"]);
        });

        it("should use the current roles as a default value if its set", async () => {
            await handlers.roleArray(interaction, settings, {
                description: "Hello World!",
                key: "roles",
                name: "Roles",
                repository: module.settings,
                type: GuildSettingType.RoleArray
            });

            expect(interaction.editParent).toHaveBeenCalledOnce();
            expect(interaction.editParent).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: [{
                        components: [
                            expect.objectContaining({
                                default_values: [{
                                    id: "68239102456844365",
                                    type: "role"
                                }]
                            })
                        ],
                        type: ComponentType.ActionRow
                    }]
                })
            );
        });

        it("should use a custom 'max_values' if specified", async () => {
            await handlers.roleArray(interaction, settings, {
                description: "Hello World!",
                key: "roles",
                maximum: 5,
                name: "Roles",
                repository: module.settings,
                type: GuildSettingType.RoleArray
            });

            expect(interaction.editParent).toHaveBeenCalledOnce();
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

        it("should use a custom 'min_values' if specified", async () => {
            await handlers.roleArray(interaction, settings, {
                description: "Hello World!",
                key: "roles",
                minimum: 5,
                name: "Roles",
                repository: module.settings,
                type: GuildSettingType.RoleArray
            });

            expect(interaction.editParent).toHaveBeenCalledOnce();
            expect(interaction.editParent).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: [{
                        components: [
                            expect.objectContaining({
                                min_values: 5
                            })
                        ],
                        type: ComponentType.ActionRow
                    }]
                })
            );
        });

        it("should throw an error if the setting is not of type 'string[]'", async () => {
            await expect(() => handlers.roleArray(interaction, settings, {
                description: "Hello World!",
                key: "enabled",
                name: "Enabled",
                repository: module.settings,
                type: GuildSettingType.RoleArray
            })).rejects.toThrowError("The setting 'enabled' is not of type 'string[]'.");
        });

        it("should not throw an error if the setting is nullable", async () => {
            settings.roles = null as unknown as string[];

            await handlers.roleArray(interaction, settings, {
                description: "Hello World!",
                key: "roles",
                name: "Roles",
                nullable: true,
                repository: module.settings,
                type: GuildSettingType.RoleArray
            });

            expect(settings.roles).toEqual(["68239102456844360"]);
        });

        it("should show a timeout message if the user does not respond", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

            await handlers.roleArray(interaction, settings, {
                description: "Hello World!",
                key: "roles",
                name: "Roles",
                repository: module.settings,
                type: GuildSettingType.RoleArray
            });

            expect(interaction.editParent).toHaveBeenCalledTimes(2);
            expect(interaction.editParent).toHaveBeenCalledWith(timeoutContent);
        });
    });

    describe("string", () => {
        let response: ModalSubmitInteraction;

        beforeEach(() => {
            const data = createMockModalSubmitInteraction({
                components: [{
                    components: [{
                        custom_id: "string",
                        type: ComponentType.TextInput,
                        value: "foo"
                    }],
                    type: ComponentType.ActionRow
                }],
                custom_id: `config-string-${Date.now()}`
            });
            response = new ModalSubmitInteraction(data, module.client, vi.fn());
            response.createMessage = vi.fn();

            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(response);
        });

        it("should set the setting to the string value", async () => {
            await handlers.string(interaction, settings, {
                description: "Hello World!",
                key: "text",
                name: "Text",
                repository: module.settings,
                type: GuildSettingType.String
            });

            expect(settings.text).toBe("foo");
        });

        it("should set the setting to 'null' if no value is provided and the option is nullable", async () => {
            response.values.string = "";

            await handlers.string(interaction, settings, {
                description: "Hello World!",
                key: "text",
                name: "Text",
                nullable: true,
                repository: module.settings,
                type: GuildSettingType.String
            });

            expect(settings.text).toBeNull();
        });

        it("should use the current value as a default value if its set", async () => {
            await handlers.string(interaction, settings, {
                description: "Hello World!",
                key: "text",
                name: "Text",
                repository: module.settings,
                type: GuildSettingType.String
            });

            expect(interaction.createModal).toHaveBeenCalledOnce();
            expect(interaction.createModal).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: [{
                        components: [
                            expect.objectContaining({
                                value: "mock"
                            })
                        ],
                        type: ComponentType.ActionRow
                    }]
                })
            );
        });

        it("should not use a default value if the setting is 'null'", async () => {
            settings.text = null as unknown as string;

            await handlers.string(interaction, settings, {
                description: "Hello World!",
                key: "text",
                name: "Text",
                nullable: true,
                repository: module.settings,
                type: GuildSettingType.String
            });

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

        it("should send an error message if the value is too short", async () => {
            response.values.string = "foo";

            await handlers.string(interaction, settings, {
                description: "Hello World!",
                key: "text",
                minimum: 4,
                name: "Text",
                nullable: true,
                repository: module.settings,
                type: GuildSettingType.String
            });

            expect(response.createMessage).toHaveBeenCalledOnce();
            expect(response.createMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining("The value you entered is too short."),
                    flags: MessageFlags.Ephemeral
                })
            );
        });

        it("should throw an error if the setting is not of type 'string'", async () => {
            await expect(() => handlers.string(interaction, settings, {
                description: "Hello World!",
                key: "enabled",
                name: "Enabled",
                repository: module.settings,
                type: GuildSettingType.String
            })).rejects.toThrowError("The setting 'enabled' is not of type 'string'.");
        });

        it("should not throw an error if the setting is nullable", async () => {
            settings.text = null as unknown as string;

            await handlers.string(interaction, settings, {
                description: "Hello World!",
                key: "text",
                name: "Text",
                nullable: true,
                repository: module.settings,
                type: GuildSettingType.String
            });

            expect(settings.text).toBe("foo");
        });

        it("should show a timeout message if the user does not respond", async () => {
            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(undefined);

            await handlers.string(interaction, settings, {
                description: "Hello World!",
                key: "text",
                name: "Text",
                repository: module.settings,
                type: GuildSettingType.String
            });

            expect(interaction.editParent).toHaveBeenCalledOnce();
            expect(interaction.editParent).toHaveBeenCalledWith(timeoutContent);
        });
    });
});
