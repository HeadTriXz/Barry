import {
    type MockSettings,
    MockModule,
    mockBooleanOption,
    mockChannelArrayOption,
    mockChannelOption,
    mockEmojiOption,
    mockRoleArrayOption,
    mockRoleOption,
    mockSettings,
    mockStringOption
} from "./mocks.js";
import type { AnyGuildSettingOption } from "../../../../../../src/config/module.js";

import {
    ApplicationCommandInteraction,
    MessageComponentInteraction,
    ReplyableInteraction,
    UpdatableInteraction
} from "@barry/core";
import {
    createMockApplicationCommandInteraction,
    createMockMessageComponentInteraction
} from "@barry/testing";

import { ComponentType } from "@discordjs/core";
import { createMockApplication } from "../../../../../mocks/application.js";
import { timeoutContent } from "../../../../../../src/common.js";

import ConfigCommand from "../../../../../../src/modules/general/commands/chatinput/config/index.js";
import GeneralModule from "../../../../../../src/modules/general/index.js";

vi.mock("../../../../../../src/config.js", async (importOriginal) => {
    const original = await importOriginal<typeof import("../../../../../../src/config.js")>();

    original.default.emotes.unknown = new original.Emoji("unknown", "123");
    original.default.emotes.check = new original.Emoji("check", "123");
    original.default.emotes.unavailable = new original.Emoji("unavailable", "123");
    original.default.emotes.channel = new original.Emoji("channel", "123");
    original.default.emotes.role = new original.Emoji("role", "123");
    original.default.emotes.emoji = new original.Emoji("emoji", "123");
    original.default.emotes.add = new original.Emoji("add", "123");

    return original;
});

describe("/config", () => {
    let command: ConfigCommand;
    let interaction: ApplicationCommandInteraction;
    let mockModule: MockModule;
    let settings: MockSettings;

    beforeEach(async () => {
        const client = createMockApplication();
        const module = new GeneralModule(client);
        command = new ConfigCommand(module);
        mockModule = new MockModule(client);

        await client.modules.add(mockModule);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client, vi.fn());

        settings = { ...mockSettings };
    });

    describe("execute", () => {
        it("should show the overview with all available modules", async () => {
            const showSpy = vi.spyOn(command, "showModules").mockResolvedValue();

            await command.execute(interaction);

            expect(showSpy).toHaveBeenCalledOnce();
        });

        it("should ignore if the interaction was invoked outside of a guild", async () => {
            const showSpy = vi.spyOn(command, "showModules").mockResolvedValue();
            delete interaction.guildID;

            await command.execute(interaction);

            expect(showSpy).not.toHaveBeenCalled();
        });
    });

    describe("getEmoji", () => {
        it("should return the 'unknown' emoji if the value is 'null'", () => {
            const result = command.getEmoji(mockChannelOption as unknown as AnyGuildSettingOption, null);

            expect(result.toString()).toBe("<:unknown:123>");
        });

        it("should return the 'check' emoji if the value is 'true'", () => {
            const result = command.getEmoji(mockBooleanOption as unknown as AnyGuildSettingOption, true);

            expect(result.toString()).toBe("<:check:123>");
        });

        it("should return the 'unavailable' emoji if the value is 'false'", () => {
            const result = command.getEmoji(mockBooleanOption as unknown as AnyGuildSettingOption, false);

            expect(result.toString()).toBe("<:unavailable:123>");
        });

        it("should return the 'channel' emoji if the value is of type 'Channel'", () => {
            const result = command.getEmoji(mockChannelOption as unknown as AnyGuildSettingOption, "123");

            expect(result.toString()).toBe("<:channel:123>");
        });

        it("should return the 'channel' emoji if the value is of type 'Channel Array'", () => {
            const result = command.getEmoji(mockChannelArrayOption as unknown as AnyGuildSettingOption, ["123"]);

            expect(result.toString()).toBe("<:channel:123>");
        });

        it("should return the 'role' emoji if the value is of type 'Role'", () => {
            const result = command.getEmoji(mockRoleOption as unknown as AnyGuildSettingOption, "123");

            expect(result.toString()).toBe("<:role:123>");
        });

        it("should return the 'role' emoji if the value is of type 'Role Array'", () => {
            const result = command.getEmoji(mockRoleArrayOption as unknown as AnyGuildSettingOption, ["123"]);

            expect(result.toString()).toBe("<:role:123>");
        });

        it("should return the 'emoji' emoji if the value is of type 'Emoji'", () => {
            const result = command.getEmoji(mockEmojiOption as unknown as AnyGuildSettingOption, "😄");

            expect(result.toString()).toBe("<:emoji:123>");
        });

        it("should return the 'add' emoji if the value is of type 'String'", () => {
            const result = command.getEmoji(mockStringOption as unknown as AnyGuildSettingOption, "foo");

            expect(result.toString()).toBe("<:add:123>");
        });
    });

    describe("showModule", () => {
        let interaction: UpdatableInteraction;
        let response: MessageComponentInteraction;

        beforeEach(() => {
            const data = createMockMessageComponentInteraction();
            interaction = new UpdatableInteraction(data, command.client, vi.fn());
            interaction.editParent = vi.fn();

            const responseData = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "config-key",
                values: ["back"]
            });
            response = new MessageComponentInteraction(responseData, command.client, vi.fn());
            response.editParent = vi.fn();

            command.showModules = vi.fn();
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
            vi.spyOn(response, "awaitMessageComponent").mockResolvedValue(undefined);
            vi.mocked(mockModule.settings.getOrCreate).mockResolvedValue(settings);
        });

        it("should run the handler if the user selects an option", async () => {
            if (!response.data.isStringSelect()) {
                return expect.unreachable("Expected the interaction to be a string select interaction.");
            }

            const handlerSpy = vi.spyOn(mockChannelOption, "onEdit").mockResolvedValue();
            response.data.values = ["0"];

            await command.showModule(interaction, "mock");

            expect(handlerSpy).toHaveBeenCalledOnce();
            expect(handlerSpy).toHaveBeenCalledWith(mockChannelOption, response);
        });

        it("should continue listening for interactions if the user selects an option", async () => {
            if (!response.data.isStringSelect()) {
                return expect.unreachable("Expected the interaction to be a string select interaction.");
            }

            response.data.values = ["0"];
            const showSpy = vi.spyOn(command, "showModule");

            await command.showModule(interaction, "mock");

            expect(showSpy).toHaveBeenCalledTimes(2);
            expect(showSpy).toHaveBeenCalledWith(response, "mock");
        });

        it("should show the module's dependencies if the module has any", async () => {
            await command.client.modules.add(command.module);
            await command.module.dependencies.add(mockModule);

            await command.showModule(interaction, command.module.id);

            expect(interaction.editParent).toHaveBeenCalledOnce();
            expect(interaction.editParent).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: [{
                        components: [{
                            custom_id: "config-key",
                            options: expect.arrayContaining([{
                                description: mockModule.description,
                                emoji: expect.any(Object),
                                label: mockModule.name,
                                value: mockModule.id
                            }]),
                            placeholder: "Select an option.",
                            type: ComponentType.StringSelect
                        }],
                        type: ComponentType.ActionRow
                    }]
                })
            );
        });

        it("should show the module's settings if the module has any", async () => {
            await command.showModule(interaction, "mock");

            expect(interaction.editParent).toHaveBeenCalledOnce();
            expect(interaction.editParent).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: [{
                        components: [{
                            custom_id: "config-key",
                            options: expect.arrayContaining([{
                                description: mockChannelOption.description,
                                emoji: expect.any(Object),
                                label: mockChannelOption.name,
                                value: "0"
                            }]),
                            placeholder: "Select an option.",
                            type: ComponentType.StringSelect
                        }],
                        type: ComponentType.ActionRow
                    }]
                })
            );
        });

        it("should go back to the module overview if the user selects the 'back' option", async () => {
            await command.showModule(interaction, "mock");

            expect(command.showModules).toHaveBeenCalledOnce();
            expect(command.showModules).toHaveBeenCalledWith(response);
        });

        it("should show the settings of a dependency if the user selects the dependency", async () => {
            if (!response.data.isStringSelect()) {
                return expect.unreachable("Expected the interaction to be a string select interaction.");
            }

            response.data.values = [mockModule.id];

            const showSpy = vi.spyOn(command, "showModule");
            await mockModule.dependencies.add(mockModule);

            await command.showModule(interaction, "mock");

            expect(showSpy).toHaveBeenCalledTimes(2);
            expect(showSpy).toHaveBeenCalledWith(response, `${mockModule.id}.${mockModule.id}`);
        });

        it("should ignore if the interaction was invoked outside of a guild", async () => {
            const getSpy = vi.spyOn(command.client.modules, "get").mockReturnValue(mockModule);
            delete interaction.guildID;

            await command.showModule(interaction, "mock");

            expect(getSpy).not.toHaveBeenCalled();
        });

        it("should throw an error if the module does not exist", async () => {
            vi.spyOn(command.client.modules, "get").mockReturnValue(undefined);

            await expect(() => command.showModule(interaction, "mock")).rejects.toThrowError(
                "Module 'mock' not found."
            );
        });

        it("should throw an error if the module is not configurable", async () => {
            if (!response.data.isStringSelect()) {
                return expect.unreachable("Expected the interaction to be a string select interaction.");
            }

            response.data.values = ["channelID"];

            await command.client.modules.add(command.module);

            await expect(() => command.showModule(interaction, command.module.id)).rejects.toThrowError(
                `Module '${command.module.id}' is not configurable.`
            );
        });
    });

    describe("showModules", () => {
        let interaction: ReplyableInteraction;
        let response: MessageComponentInteraction;

        beforeEach(() => {
            const data = createMockMessageComponentInteraction();
            interaction = new ReplyableInteraction(data, command.client, vi.fn());
            interaction.createMessage = vi.fn();
            interaction.editOriginalMessage = vi.fn();

            const responseData = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "config-module",
                values: [mockModule.id]
            });
            response = new MessageComponentInteraction(responseData, command.client, vi.fn());

            command.showModule = vi.fn();
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
        });

        it("should show all configurable modules", async () => {
            await command.module.dependencies.add(mockModule);
            await command.client.modules.add(command.module);

            await command.showModules(interaction);

            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: [{
                        components: [{
                            custom_id: "config-module",
                            options: expect.arrayContaining([{
                                description: command.module.description,
                                label: command.module.name,
                                value: command.module.id
                            }]),
                            placeholder: "Select a module.",
                            type: ComponentType.StringSelect
                        }],
                        type: ComponentType.ActionRow
                    }]
                })
            );
        });

        it("should show the selected module", async () => {
            await command.showModules(interaction);

            expect(command.showModule).toHaveBeenCalledOnce();
            expect(command.showModule).toHaveBeenCalledWith(response, mockModule.id);
        });

        it("should edit the original message if the interaction is updatable", async () => {
            const data = createMockMessageComponentInteraction();
            const interaction = new UpdatableInteraction(data, command.client, vi.fn());
            interaction.editParent = vi.fn();

            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);

            await command.showModules(interaction);

            expect(interaction.editParent).toHaveBeenCalledOnce();
        });

        it("should send a new message if the interaction is not updatable", async () => {
            await command.showModules(interaction);

            expect(interaction.createMessage).toHaveBeenCalledOnce();
        });

        it("should ignore if the interaction was invoked outside of a guild", async () => {
            delete interaction.guildID;

            await command.showModules(interaction);

            expect(interaction.createMessage).not.toHaveBeenCalled();
        });

        it("should show a timeout message if the user does not respond", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

            await command.showModules(interaction);

            expect(interaction.editOriginalMessage).toHaveBeenCalledOnce();
            expect(interaction.editOriginalMessage).toHaveBeenCalledWith(timeoutContent);
        });
    });
});
