import {
    type IndexBasedPaginationOptions,
    type ValueBasedPaginationOptions,
    PaginationMessage
} from "../../src/utils/index.js";
import {
    type ReplyableInteraction,
    ApplicationCommandInteraction,
    MessageComponentInteraction
} from "@barry-bot/core";

import { ComponentType, MessageFlags } from "@discordjs/core";
import {
    createMockApplicationCommandInteraction,
    createMockMessageComponentInteraction,
    mockMessage,
    mockUser
} from "@barry-bot/testing";

import { Application } from "../../src/Application.js";
import { createMockApplication } from "../mocks/index.js";

describe("PaginationMessage", () => {
    let client: Application;

    let indexOptions: IndexBasedPaginationOptions;
    let valueOptions: ValueBasedPaginationOptions<number>;

    let interaction: ReplyableInteraction;
    let nextInteraction: MessageComponentInteraction;
    let previousInteraction: MessageComponentInteraction;

    beforeEach(() => {
        vi.useFakeTimers();

        client = createMockApplication();

        vi.spyOn(client.api.webhooks, "editMessage")
            .mockResolvedValue(mockMessage);

        const data = createMockApplicationCommandInteraction();
        const nextComponent = createMockMessageComponentInteraction({
            component_type: ComponentType.Button,
            custom_id: "next"
        });
        const previousComponent = createMockMessageComponentInteraction({
            component_type: ComponentType.Button,
            custom_id: "previous"
        });

        interaction = new ApplicationCommandInteraction(data, client, vi.fn());
        nextInteraction = new MessageComponentInteraction(nextComponent, client, vi.fn());
        previousInteraction = new MessageComponentInteraction(previousComponent, client, vi.fn());

        nextInteraction.deferUpdate = vi.fn();
        previousInteraction.deferUpdate = vi.fn();

        const baseOptions = {
            flags: MessageFlags.Ephemeral,
            interaction: interaction,
            pageSize: 1
        };

        indexOptions = {
            ...baseOptions,
            content: (index) => ({ content: index.toString() }),
            count: 5
        };

        valueOptions = {
            ...baseOptions,
            content: ([value]) => ({ content: value.toString() }),
            values: [1, 2, 3, 4, 5]
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("Initialization", () => {
        it("should defer the interaction with the provided flags", async () => {
            const deferSpy = vi.spyOn(interaction, "defer");
            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(undefined);

            await PaginationMessage.create({ ...indexOptions, flags: MessageFlags.Ephemeral });

            expect(deferSpy).toHaveBeenCalledOnce();
            expect(deferSpy).toHaveBeenCalledWith({
                flags: MessageFlags.Ephemeral
            });
        });

        it("should start on page one initially", async () => {
            const editSpy = vi.spyOn(interaction, "editOriginalMessage");
            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(undefined);

            await PaginationMessage.create(indexOptions);

            expect(editSpy).toHaveBeenCalledTimes(2);
            expect(editSpy).toHaveBeenCalledWith({
                components: expect.any(Array),
                content: "0"
            });
        });

        it("should return the correct count for index-based pagination", () => {
            const message = new PaginationMessage(indexOptions);

            expect(message.count).toBe(5);
        });

        it("should return the correct count for value-based pagination", () => {
            const message = new PaginationMessage(valueOptions);

            expect(message.count).toBe(5);
        });
    });

    describe("Page Content Generation", () => {
        it("should return the correct items for value-based pagination", async () => {
            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(undefined);

            const loadSpy = vi.fn(([a, b]: number[]) => ({ content: `${a}-${b}` }));
            await PaginationMessage.create({
                ...valueOptions,
                content: loadSpy,
                pageSize: 2
            });

            expect(loadSpy).toHaveBeenCalledOnce();
            expect(loadSpy).toHaveBeenCalledWith([1, 2], 0);
        });

        it("should call the 'onRefresh' callback when refreshing the message", async () => {
            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(undefined);

            const refreshSpy = vi.fn();
            await PaginationMessage.create({
                ...indexOptions,
                onRefresh: refreshSpy
            });

            expect(refreshSpy).toHaveBeenCalledOnce();
        });
    });

    describe("Navigation", () => {
        it("should navigate to the next page", async () => {
            const initialEditSpy = vi.spyOn(interaction, "editOriginalMessage");
            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(nextInteraction);

            const nextEditSpy = vi.spyOn(nextInteraction, "editOriginalMessage");
            vi.spyOn(nextInteraction, "awaitMessageComponent")
                .mockResolvedValue(undefined);

            await PaginationMessage.create(indexOptions);

            expect(initialEditSpy).toHaveBeenCalledOnce();
            expect(initialEditSpy).toHaveBeenCalledWith({
                components: expect.any(Array),
                content: "0"
            });

            expect(nextEditSpy).toHaveBeenCalledTimes(2);
            expect(nextEditSpy).toBeCalledWith({
                components: expect.any(Array),
                content: "1"
            });
        });

        it("should navigate to the previous page", async () => {
            const initialEditSpy = vi.spyOn(interaction, "editOriginalMessage");
            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(nextInteraction);

            const nextEditSpy = vi.spyOn(nextInteraction, "editOriginalMessage");
            vi.spyOn(nextInteraction, "awaitMessageComponent")
                .mockResolvedValueOnce(previousInteraction);

            const previousEditSpy = vi.spyOn(previousInteraction, "editOriginalMessage");
            vi.spyOn(previousInteraction, "awaitMessageComponent")
                .mockResolvedValue(undefined);

            await PaginationMessage.create(indexOptions);

            expect(initialEditSpy).toHaveBeenCalledOnce();
            expect(initialEditSpy).toHaveBeenCalledWith({
                components: expect.any(Array),
                content: "0"
            });

            expect(nextEditSpy).toHaveBeenCalledOnce();
            expect(nextEditSpy).toBeCalledWith({
                components: expect.any(Array),
                content: "1"
            });

            expect(previousEditSpy).toHaveBeenCalledTimes(2);
            expect(previousEditSpy).toHaveBeenCalledWith({
                components: expect.any(Array),
                content: "0"
            });
        });

        it("should show an error if the interaction is not initiated by the user", async () => {
            nextInteraction.user = { ...mockUser, id: "0" };

            const initialEditSpy = vi.spyOn(interaction, "editOriginalMessage");
            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(nextInteraction);

            const nextCreateMessageSpy = vi.spyOn(nextInteraction, "createMessage");
            const nextEditSpy = vi.spyOn(nextInteraction, "editOriginalMessage");
            const promise = PaginationMessage.create(indexOptions);

            vi.runAllTimersAsync();
            await promise;

            expect(initialEditSpy).toHaveBeenCalledTimes(2);
            expect(initialEditSpy).toHaveBeenCalledWith({
                components: expect.any(Array),
                content: "0"
            });

            expect(nextEditSpy).not.toHaveBeenCalled();
            expect(nextCreateMessageSpy).toHaveBeenCalledOnce();
            expect(nextCreateMessageSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("You cannot interact with this message as it was not initiated by you. Please create your own using the appropriate command."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should stop listening for navigation updates once the timeout is reached", async () => {
            const editSpy = vi.spyOn(interaction, "editOriginalMessage");
            const promise = PaginationMessage.create(indexOptions);

            vi.runAllTimersAsync();
            await promise;

            expect(editSpy).toHaveBeenCalledTimes(2);
            expect(editSpy).toHaveBeenCalledWith({
                components: []
            });
        });

        it("should navigate to the correct page when using 'setIndex'", async () => {
            const editSpy = vi.spyOn(interaction, "editOriginalMessage");
            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(undefined);

            const message = await PaginationMessage.create(indexOptions);

            message.setIndex(3);
            await message.refresh();

            expect(editSpy).toHaveBeenCalledTimes(3);
            expect(editSpy).toHaveBeenCalledWith({
                components: expect.any(Array),
                content: "3"
            });
        });
    });

    describe("Pre-load Pages", () => {
        it("should automatically pre-load pages in the background", async () => {
            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(undefined);

            const loadSpy = vi.fn((index: number) => ({ content: index.toString() }));
            await PaginationMessage.create({
                ...indexOptions,
                content: loadSpy,
                preLoadPages: 1
            });

            expect(loadSpy).toHaveBeenCalledTimes(2);
            expect(loadSpy).toHaveBeenCalledWith(0);
            expect(loadSpy).toHaveBeenCalledWith(1);
        });

        it("should not pre-load pages if 'preLoadPages' is undefined", async () => {
            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(undefined);

            const loadSpy = vi.fn((index: number) => ({ content: index.toString() }));
            const message = await PaginationMessage.create({ ...indexOptions, content: loadSpy });

            await message.preLoadPages();

            expect(loadSpy).toHaveBeenCalledTimes(1);
            expect(loadSpy).toHaveBeenCalledWith(0);
            expect(loadSpy).not.toHaveBeenCalledWith(1);
        });

        it("should not automatically pre-load pages if 'preLoadPages' is undefined", async () => {
            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(undefined);

            const loadSpy = vi.fn((index: number) => ({ content: index.toString() }));
            await PaginationMessage.create({ ...indexOptions, content: loadSpy });

            expect(loadSpy).toHaveBeenCalledOnce();
            expect(loadSpy).toHaveBeenCalledWith(0);
            expect(loadSpy).not.toHaveBeenCalledWith(1);
        });

        it("should not automatically pre-load pages if 'preLoadPages' is 0", async () => {
            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(undefined);

            const loadSpy = vi.fn((index: number) => ({ content: index.toString() }));
            await PaginationMessage.create({
                ...indexOptions,
                content: loadSpy,
                preLoadPages: 0
            });

            expect(loadSpy).toHaveBeenCalledOnce();
            expect(loadSpy).toHaveBeenCalledWith(0);
            expect(loadSpy).not.toHaveBeenCalledWith(1);
        });

        it("should not pre-load pages beyond the last page", async () => {
            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(undefined);

            const loadSpy = vi.fn((index: number) => ({ content: index.toString() }));
            await PaginationMessage.create({
                ...indexOptions,
                content: loadSpy,
                preLoadPages: 10
            });

            expect(loadSpy).toHaveBeenCalledTimes(5);
            expect(loadSpy).toHaveBeenCalledWith(0);
            expect(loadSpy).toHaveBeenCalledWith(1);
            expect(loadSpy).toHaveBeenCalledWith(2);
            expect(loadSpy).toHaveBeenCalledWith(3);
            expect(loadSpy).toHaveBeenCalledWith(4);
            expect(loadSpy).not.toHaveBeenCalledWith(5);
        });

        it("should remove cache that is out of range when pre-loading pages", async () => {
            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(nextInteraction);

            vi.spyOn(nextInteraction, "awaitMessageComponent")
                .mockResolvedValueOnce(nextInteraction)
                .mockResolvedValueOnce(previousInteraction);

            vi.spyOn(previousInteraction, "awaitMessageComponent")
                .mockResolvedValueOnce(previousInteraction)
                .mockResolvedValue(undefined);

            const loadSpy = vi.fn((index: number) => ({ content: index.toString() }));
            await PaginationMessage.create({
                ...indexOptions,
                content: loadSpy,
                preLoadPages: 1
            });

            expect(loadSpy).toHaveBeenCalledTimes(5);
            expect(loadSpy).toHaveBeenCalledWith(0);
            expect(loadSpy).toHaveBeenCalledWith(1);
            expect(loadSpy).toHaveBeenCalledWith(2);
            expect(loadSpy).toHaveBeenCalledWith(3);
            expect(loadSpy).toHaveBeenLastCalledWith(0);
        });

        it("should clear the cache", async () => {
            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(undefined);

            const loadSpy = vi.fn((index: number) => ({ content: index.toString() }));
            const message = await PaginationMessage.create({
                ...indexOptions,
                content: loadSpy,
                preLoadPages: 2
            });

            message.clearCache();
            await message.refresh();

            expect(loadSpy).toHaveBeenCalledTimes(4);
            expect(loadSpy).toHaveBeenCalledWith(0);
            expect(loadSpy).toHaveBeenCalledWith(1);
            expect(loadSpy).toHaveBeenCalledWith(2);
        });
    });

    describe("Buttons", () => {
        it("should use custom buttons if 'buttons' is provided", async () => {
            const editSpy = vi.spyOn(interaction, "editOriginalMessage");
            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(undefined);

            await PaginationMessage.create({
                ...indexOptions,
                buttons: (previous, next) => [
                    { ...previous, label: "Foo" },
                    { ...next, label: "Bar" }
                ]
            });

            expect(editSpy).toHaveBeenCalledTimes(2);
            expect(editSpy).toHaveBeenCalledWith({
                components: [{
                    components: [
                        expect.objectContaining({
                            label: "Foo"
                        }),
                        expect.objectContaining({
                            label: "Bar"
                        })
                    ],
                    type: ComponentType.ActionRow
                }],
                content: "0"
            });
        });

        it("should use the default buttons if 'buttons' is undefined", async () => {
            const editSpy = vi.spyOn(interaction, "editOriginalMessage");
            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(undefined);

            await PaginationMessage.create(indexOptions);

            expect(editSpy).toHaveBeenCalledTimes(2);
            expect(editSpy).toHaveBeenCalledWith({
                components: [{
                    components: [
                        expect.objectContaining({
                            label: "Previous Page"
                        }),
                        expect.objectContaining({
                            label: "Next Page"
                        })
                    ],
                    type: ComponentType.ActionRow
                }],
                content: "0"
            });
        });

        it("should append to existing components", async () => {
            const editSpy = vi.spyOn(interaction, "editOriginalMessage");
            vi.spyOn(interaction, "awaitMessageComponent")
                .mockResolvedValueOnce(undefined);

            await PaginationMessage.create({
                ...indexOptions,
                content: (index: number) => ({
                    components: [{
                        components: [],
                        type: ComponentType.ActionRow
                    }],
                    content: index.toString()
                })
            });

            expect(editSpy).toHaveBeenCalledTimes(2);
            expect(editSpy).toHaveBeenCalledWith({
                components: [
                    {
                        components: [],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [
                            expect.objectContaining({
                                label: "Previous Page"
                            }),
                            expect.objectContaining({
                                label: "Next Page"
                            })
                        ],
                        type: ComponentType.ActionRow
                    }
                ],
                content: "0"
            });
        });
    });
});
