import type { Canvas } from "canvas-constructor/napi-rs";

import {
    ApplicationCommandInteraction,
    MessageComponentInteraction,
    ModalSubmitInteraction
} from "@barry/core";
import { ComponentType, MessageFlags } from "@discordjs/core";
import { MemberActivitySortBy, MemberActivitySortOrder } from "../../../../../../src/modules/leveling/database/index.js";
import {
    createMockApplicationCommandInteraction,
    createMockMessageComponentInteraction,
    createMockModalSubmitInteraction,
    mockMessage,
    mockUser
} from "@barry/testing";

import { LeaderboardCanvas } from "../../../../../../src/modules/leveling/commands/chatinput/leaderboard/LeaderboardCanvas.js";
import { PaginationMessage } from "../../../../../../src/utils/pagination.js";
import { createMockApplication } from "../../../../../mocks/application.js";

import LeaderboardCommand, { LeaderboardMenuOption } from "../../../../../../src/modules/leveling/commands/chatinput/leaderboard/index.js";
import LevelingModule from "../../../../../../src/modules/leveling/index.js";

vi.mock("canvas-constructor/napi-rs", () => {
    const MockCanvas: typeof Canvas = vi.fn();
    MockCanvas.prototype.measureText = vi.fn().mockReturnValue({ width: 0 } as TextMetrics);
    MockCanvas.prototype.printCircle = vi.fn().mockReturnThis();
    MockCanvas.prototype.printCircularImage = vi.fn().mockReturnThis();
    MockCanvas.prototype.printRoundedRectangle = vi.fn().mockReturnThis();
    MockCanvas.prototype.printText = vi.fn().mockReturnThis();
    MockCanvas.prototype.restore = vi.fn().mockReturnThis();
    MockCanvas.prototype.rotate = vi.fn().mockReturnThis();
    MockCanvas.prototype.save = vi.fn().mockReturnThis();
    MockCanvas.prototype.setColor = vi.fn().mockReturnThis();
    MockCanvas.prototype.setLineCap = vi.fn().mockReturnThis();
    MockCanvas.prototype.setStroke = vi.fn().mockReturnThis();
    MockCanvas.prototype.setStrokeWidth = vi.fn().mockReturnThis();
    MockCanvas.prototype.setTextAlign = vi.fn().mockReturnThis();
    MockCanvas.prototype.setTextFont = vi.fn().mockReturnThis();
    MockCanvas.prototype.setTextSize = vi.fn().mockReturnThis();
    MockCanvas.prototype.setTransform = vi.fn().mockReturnThis();
    MockCanvas.prototype.pngAsync = vi.fn().mockResolvedValue(Buffer.from("Hello World"));

    return {
        Canvas: MockCanvas,
        loadFont: vi.fn(),
        loadImage: vi.fn()
    };
});

vi.mock("node:fs/promises", async (importOriginal) => {
    const original = await importOriginal<typeof import("node:fs/promises")>();
    return {
        ...original,
        readFile: vi.fn().mockResolvedValue(Buffer.from("Hello World"))
    };
});

describe("/leaderboard", () => {
    const guildID = "68239102456844360";
    const userID = "257522665441460225";

    let command: LeaderboardCommand;
    let interaction: ApplicationCommandInteraction;

    beforeEach(() => {
        const client = createMockApplication();

        vi.spyOn(client.api.webhooks, "editMessage").mockResolvedValue(mockMessage);
        vi.spyOn(client.api.users, "get").mockResolvedValue(mockUser);

        const module = new LevelingModule(client);
        command = new LeaderboardCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client, vi.fn());

        const member = {
            guildID: guildID,
            userID: userID,
            experience: 1520,
            level: 5,
            messageCount: 75,
            reputation: 2,
            voiceMinutes: 0
        };

        vi.mocked(client.prisma.memberActivity.count).mockResolvedValue(25);
        vi.mocked(client.prisma.memberActivity.findMany).mockResolvedValue(
            Array.from({ length: 25 }, () => member)
        );
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("execute", () => {
        it("should send the leaderboard of the guild", async () => {
            const editSpy = vi.spyOn(interaction, "editOriginalMessage");
            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValue(undefined);

            await command.execute(interaction);

            expect(editSpy).toHaveBeenCalledTimes(3);
            expect(editSpy).toHaveBeenCalledWith({
                attachments: [{ id: "0" }],
                components: expect.any(Array),
                content: "",
                files: [{
                    data: Buffer.from("Hello World"),
                    name: "leaderboard.png"
                }]
            });
        });

        it("should show the loading gif while generating the leaderboard", async () => {
            const editSpy = vi.spyOn(interaction, "editOriginalMessage");
            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValue(undefined);

            await command.execute(interaction);

            expect(editSpy).toHaveBeenCalledTimes(3);
            expect(editSpy).toHaveBeenCalledWith({
                attachments: [{ id: "0" }],
                files: [{
                    contentType: "image/gif",
                    data: Buffer.from("Hello World"),
                    name: "loading.gif"
                }]
            });
        });

        it("should ignore if the command was invoked outside a guild", async () => {
            const editSpy = vi.spyOn(interaction, "editOriginalMessage");
            interaction.guildID = undefined;

            await command.execute(interaction);

            expect(editSpy).not.toHaveBeenCalled();
        });
    });

    describe("awaitMenuButton", () => {
        it("should open the select menu if a user interacts with the menu button", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "menu"
            });

            const menuInteraction = new MessageComponentInteraction(data, command.client, vi.fn());
            const createMessageSpy = vi.spyOn(menuInteraction, "createMessage");

            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(menuInteraction)
                .mockResolvedValue(undefined);

            vi.spyOn(menuInteraction, "awaitMessageComponent").mockResolvedValue(undefined);

            await command.execute(interaction);

            expect(createMessageSpy).toHaveBeenCalledOnce();
            expect(createMessageSpy).toHaveBeenCalledWith({
                components: [{
                    components: [{
                        custom_id: "menu_option",
                        options: expect.any(Array),
                        type: ComponentType.StringSelect
                    }],
                    type: ComponentType.ActionRow
                }],
                flags: MessageFlags.Ephemeral
            });
        });

        it("should show an error if the command was not initiated by the user", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "menu"
            });

            data.user = { ...mockUser, id: "0" };

            const menuInteraction = new MessageComponentInteraction(data, command.client, vi.fn());
            const createMessageSpy = vi.spyOn(menuInteraction, "createMessage");

            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(menuInteraction)
                .mockResolvedValue(undefined);

            await command.execute(interaction);

            expect(createMessageSpy).toHaveBeenCalledOnce();
            expect(createMessageSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("You cannot interact with this message as it was not initiated by you. Please create your own using the appropriate command."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should continue listening for interactions with the menu button", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "menu"
            });

            const menuInteraction = new MessageComponentInteraction(data, command.client, vi.fn());
            menuInteraction.createMessage = vi.fn();

            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(menuInteraction)
                .mockResolvedValueOnce(menuInteraction)
                .mockResolvedValue(undefined);

            vi.spyOn(menuInteraction, "awaitMessageComponent").mockResolvedValue(undefined);

            await command.execute(interaction);

            expect(menuInteraction.createMessage).toHaveBeenCalledTimes(2);
            expect(menuInteraction.createMessage).toHaveBeenCalledWith({
                components: [{
                    components: [{
                        custom_id: "menu_option",
                        options: expect.any(Array),
                        type: ComponentType.StringSelect
                    }],
                    type: ComponentType.ActionRow
                }],
                flags: MessageFlags.Ephemeral
            });
        });
    });

    describe("awaitMenuSelect", () => {
        it("should update the sortBy option if the user selected it", async () => {
            const menuData = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "menu"
            });

            const selectData = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "menu_option",
                values: [LeaderboardMenuOption.SortBy]
            });

            const menuInteraction = new MessageComponentInteraction(menuData, command.client, vi.fn());
            const selectInteraction = new MessageComponentInteraction(selectData, command.client, vi.fn());
            const generateSpy = vi.spyOn(LeaderboardCanvas.prototype, "generate");

            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(menuInteraction)
                .mockResolvedValue(undefined);

            vi.spyOn(menuInteraction, "awaitMessageComponent")
                .mockResolvedValueOnce(selectInteraction)
                .mockResolvedValue(undefined);

            vi.spyOn(selectInteraction, "awaitMessageComponent")
                .mockResolvedValueOnce(selectInteraction)
                .mockResolvedValue(undefined);

            await command.execute(interaction);

            expect(generateSpy).toHaveBeenCalledTimes(4);
            expect(generateSpy).toHaveBeenNthCalledWith(3, MemberActivitySortBy.Reputation);
            expect(generateSpy).toHaveBeenNthCalledWith(4, MemberActivitySortBy.Experience);
        });

        it("should update the sortOrder option if the user selected it", async () => {
            const menuData = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "menu"
            });

            const selectData = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "menu_option",
                values: [LeaderboardMenuOption.SortOrder]
            });

            const menuInteraction = new MessageComponentInteraction(menuData, command.client, vi.fn());
            const selectInteraction = new MessageComponentInteraction(selectData, command.client, vi.fn());
            const getAllSpy = vi.spyOn(command.module.memberActivity, "getAll");

            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(menuInteraction)
                .mockResolvedValue(undefined);

            vi.spyOn(menuInteraction, "awaitMessageComponent")
                .mockResolvedValueOnce(selectInteraction)
                .mockResolvedValue(undefined);

            vi.spyOn(selectInteraction, "awaitMessageComponent")
                .mockResolvedValueOnce(selectInteraction)
                .mockResolvedValue(undefined);

            await command.execute(interaction);

            expect(getAllSpy).toHaveBeenCalledTimes(4);
            expect(getAllSpy).toHaveBeenCalledWith(guildID, {
                limit: 8,
                page: 1,
                sortBy: MemberActivitySortBy.Experience,
                sortOrder: MemberActivitySortOrder.Ascending
            });
        });

        it("should clear the cache after selecting an option", async () => {
            const menuData = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "menu"
            });

            const selectData = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "menu_option",
                values: [LeaderboardMenuOption.SortBy]
            });

            const menuInteraction = new MessageComponentInteraction(menuData, command.client, vi.fn());
            const selectInteraction = new MessageComponentInteraction(selectData, command.client, vi.fn());
            const clearCacheSpy = vi.spyOn(PaginationMessage.prototype, "clearCache");

            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(menuInteraction)
                .mockResolvedValue(undefined);

            vi.spyOn(menuInteraction, "awaitMessageComponent")
                .mockResolvedValueOnce(selectInteraction)
                .mockResolvedValue(undefined);

            vi.spyOn(selectInteraction, "awaitMessageComponent").mockResolvedValue(undefined);

            await command.execute(interaction);

            expect(clearCacheSpy).toHaveBeenCalledOnce();
        });

        it("should refresh the message after selecting an option", async () => {
            const menuData = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "menu"
            });

            const selectData = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "menu_option",
                values: [LeaderboardMenuOption.SortBy]
            });

            const menuInteraction = new MessageComponentInteraction(menuData, command.client, vi.fn());
            const selectInteraction = new MessageComponentInteraction(selectData, command.client, vi.fn());
            const refreshSpy = vi.spyOn(PaginationMessage.prototype, "refresh");

            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(menuInteraction)
                .mockResolvedValue(undefined);

            vi.spyOn(menuInteraction, "awaitMessageComponent")
                .mockResolvedValueOnce(selectInteraction)
                .mockResolvedValue(undefined);

            vi.spyOn(selectInteraction, "awaitMessageComponent").mockResolvedValue(undefined);

            await command.execute(interaction);

            expect(refreshSpy).toHaveBeenCalledTimes(2);
        });

        it("should reset the select menu after usage", async () => {
            const menuData = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "menu"
            });

            const selectData = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "menu_option",
                values: [LeaderboardMenuOption.SortBy]
            });

            const menuInteraction = new MessageComponentInteraction(menuData, command.client, vi.fn());
            const selectInteraction = new MessageComponentInteraction(selectData, command.client, vi.fn());
            selectInteraction.editParent = vi.fn();

            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(menuInteraction)
                .mockResolvedValue(undefined);

            vi.spyOn(menuInteraction, "awaitMessageComponent")
                .mockResolvedValueOnce(selectInteraction)
                .mockResolvedValue(undefined);

            vi.spyOn(selectInteraction, "awaitMessageComponent").mockResolvedValue(undefined);

            await command.execute(interaction);

            expect(selectInteraction.editParent).toHaveBeenCalledOnce();
            expect(selectInteraction.editParent).toHaveBeenCalledWith({
                components: [{
                    components: [{
                        custom_id: "menu_option",
                        options: expect.any(Array),
                        type: ComponentType.StringSelect
                    }],
                    type: ComponentType.ActionRow
                }],
                flags: MessageFlags.Ephemeral
            });
        });

        it("should do nothing if the user does not select an option", async () => {
            const menuData = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "menu"
            });

            const menuInteraction = new MessageComponentInteraction(menuData, command.client, vi.fn());
            const clearCacheSpy = vi.spyOn(PaginationMessage.prototype, "clearCache");

            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(menuInteraction)
                .mockResolvedValue(undefined);

            vi.spyOn(menuInteraction, "awaitMessageComponent")
                .mockResolvedValue(undefined);

            await command.execute(interaction);

            expect(clearCacheSpy).not.toHaveBeenCalled();
        });

        it("should do nothing if the component is not of type 'StringSelect'", async () => {
            const menuData = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "menu"
            });

            const buttonData = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "menu_option"
            });

            const menuInteraction = new MessageComponentInteraction(menuData, command.client, vi.fn());
            const buttonInteraction = new MessageComponentInteraction(buttonData, command.client, vi.fn());
            const clearCacheSpy = vi.spyOn(PaginationMessage.prototype, "clearCache");

            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(menuInteraction)
                .mockResolvedValue(undefined);

            vi.spyOn(menuInteraction, "awaitMessageComponent")
                .mockResolvedValueOnce(buttonInteraction)
                .mockResolvedValue(undefined);

            await command.execute(interaction);

            expect(clearCacheSpy).not.toHaveBeenCalled();
        });
    });

    describe("awaitNewPage", () => {
        beforeEach(() => {
            vi.useFakeTimers().setSystemTime("2023-01-01");
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it("should prompt user for page number and return valid page", async () => {
            const menuData = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "menu"
            });

            const selectData = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "menu_option",
                values: [LeaderboardMenuOption.GoToPage]
            });

            const pageData = createMockModalSubmitInteraction({
                components: [{
                    components: [{
                        custom_id: "page",
                        type: ComponentType.TextInput,
                        value: "2"
                    }],
                    type: ComponentType.ActionRow
                }],
                custom_id: `${Date.now()}_go_to_page`
            });

            const menuInteraction = new MessageComponentInteraction(menuData, command.client, vi.fn());
            const selectInteraction = new MessageComponentInteraction(selectData, command.client, vi.fn());
            const pageInteraction = new ModalSubmitInteraction(pageData, command.client, vi.fn());
            const setIndexSpy = vi.spyOn(PaginationMessage.prototype, "setIndex");

            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(menuInteraction)
                .mockResolvedValue(undefined);

            vi.spyOn(menuInteraction, "awaitMessageComponent").mockResolvedValueOnce(selectInteraction);
            vi.spyOn(selectInteraction, "awaitModalSubmit").mockResolvedValueOnce(pageInteraction);
            vi.spyOn(selectInteraction, "awaitMessageComponent").mockResolvedValue(undefined);

            await command.execute(interaction);

            expect(setIndexSpy).toHaveBeenCalledOnce();
            expect(setIndexSpy).toHaveBeenCalledWith(1);
        });

        it("should return undefined if user input is not a number", async () => {
            const menuData = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "menu"
            });

            const selectData = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "menu_option",
                values: [LeaderboardMenuOption.GoToPage]
            });

            const pageData = createMockModalSubmitInteraction({
                components: [{
                    components: [{
                        custom_id: "page",
                        type: ComponentType.TextInput,
                        value: "Hello World"
                    }],
                    type: ComponentType.ActionRow
                }],
                custom_id: `${Date.now()}_go_to_page`
            });

            const menuInteraction = new MessageComponentInteraction(menuData, command.client, vi.fn());
            const selectInteraction = new MessageComponentInteraction(selectData, command.client, vi.fn());
            const pageInteraction = new ModalSubmitInteraction(pageData, command.client, vi.fn());
            const setIndexSpy = vi.spyOn(PaginationMessage.prototype, "setIndex");

            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(menuInteraction)
                .mockResolvedValue(undefined);

            vi.spyOn(menuInteraction, "awaitMessageComponent").mockResolvedValueOnce(selectInteraction);
            vi.spyOn(selectInteraction, "awaitModalSubmit").mockResolvedValueOnce(pageInteraction);
            vi.spyOn(selectInteraction, "awaitMessageComponent").mockResolvedValue(undefined);

            await command.execute(interaction);

            expect(setIndexSpy).not.toHaveBeenCalled();
        });

        it("should return undefined if user input is less than 1", async () => {
            const menuData = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "menu"
            });

            const selectData = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "menu_option",
                values: [LeaderboardMenuOption.GoToPage]
            });

            const pageData = createMockModalSubmitInteraction({
                components: [{
                    components: [{
                        custom_id: "page",
                        type: ComponentType.TextInput,
                        value: "-5"
                    }],
                    type: ComponentType.ActionRow
                }],
                custom_id: `${Date.now()}_go_to_page`
            });

            const menuInteraction = new MessageComponentInteraction(menuData, command.client, vi.fn());
            const selectInteraction = new MessageComponentInteraction(selectData, command.client, vi.fn());
            const pageInteraction = new ModalSubmitInteraction(pageData, command.client, vi.fn());
            const setIndexSpy = vi.spyOn(PaginationMessage.prototype, "setIndex");

            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(menuInteraction)
                .mockResolvedValue(undefined);

            vi.spyOn(menuInteraction, "awaitMessageComponent").mockResolvedValueOnce(selectInteraction);
            vi.spyOn(selectInteraction, "awaitModalSubmit").mockResolvedValueOnce(pageInteraction);
            vi.spyOn(selectInteraction, "awaitMessageComponent").mockResolvedValue(undefined);

            await command.execute(interaction);

            expect(setIndexSpy).not.toHaveBeenCalled();
        });

        it("should return undefined if user input is greater than the last page", async () => {
            const menuData = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "menu"
            });

            const selectData = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "menu_option",
                values: [LeaderboardMenuOption.GoToPage]
            });

            const pageData = createMockModalSubmitInteraction({
                components: [{
                    components: [{
                        custom_id: "page",
                        type: ComponentType.TextInput,
                        value: "205"
                    }],
                    type: ComponentType.ActionRow
                }],
                custom_id: `${Date.now()}_go_to_page`
            });

            const menuInteraction = new MessageComponentInteraction(menuData, command.client, vi.fn());
            const selectInteraction = new MessageComponentInteraction(selectData, command.client, vi.fn());
            const pageInteraction = new ModalSubmitInteraction(pageData, command.client, vi.fn());
            const setIndexSpy = vi.spyOn(PaginationMessage.prototype, "setIndex");

            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(menuInteraction)
                .mockResolvedValue(undefined);

            vi.spyOn(menuInteraction, "awaitMessageComponent").mockResolvedValueOnce(selectInteraction);
            vi.spyOn(selectInteraction, "awaitModalSubmit").mockResolvedValueOnce(pageInteraction);
            vi.spyOn(selectInteraction, "awaitMessageComponent").mockResolvedValue(undefined);

            await command.execute(interaction);

            expect(setIndexSpy).not.toHaveBeenCalled();
        });

        it("should return undefined if the user does not respond", async () => {
            const menuData = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "menu"
            });

            const selectData = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "menu_option",
                values: [LeaderboardMenuOption.GoToPage]
            });

            const menuInteraction = new MessageComponentInteraction(menuData, command.client, vi.fn());
            const selectInteraction = new MessageComponentInteraction(selectData, command.client, vi.fn());
            const setIndexSpy = vi.spyOn(PaginationMessage.prototype, "setIndex");

            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(menuInteraction)
                .mockResolvedValue(undefined);

            vi.spyOn(menuInteraction, "awaitMessageComponent").mockResolvedValueOnce(selectInteraction);
            vi.spyOn(selectInteraction, "awaitModalSubmit").mockResolvedValueOnce(undefined);
            vi.spyOn(selectInteraction, "awaitMessageComponent").mockResolvedValue(undefined);

            await command.execute(interaction);

            expect(setIndexSpy).not.toHaveBeenCalled();
        });
    });
});
