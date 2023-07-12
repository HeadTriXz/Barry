import {
    type Client,
    type ReplyableInteraction,
    ApplicationCommandInteraction,
    MessageComponentInteraction
} from "@barry/core";
import { type PaginationOptions, createPaginatedMessage } from "../../src/utils/index.js";

import { ButtonStyle, ComponentType, MessageFlags } from "@discordjs/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    createMockApplicationCommandInteraction,
    createMockMessageComponentInteraction,
    mockMessage
} from "@barry/testing";

import { createMockClient } from "../mocks/index.js";

describe("createPaginatedMessage", () => {
    let client: Client;
    let mockPaginationOptions: PaginationOptions<string>;

    let interaction: ReplyableInteraction;
    let nextInteraction: MessageComponentInteraction;
    let previousInteraction: MessageComponentInteraction;

    beforeEach(() => {
        vi.useFakeTimers();

        client = createMockClient({
            api: {
                webhooks: {
                    editMessage: vi.fn().mockResolvedValue(mockMessage)
                }
            }
        });

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

        mockPaginationOptions = {
            content: ([value]) => ({ content: value }),
            flags: MessageFlags.Ephemeral,
            interaction: interaction,
            pageSize: 1,
            values: ["Foo", "Bar", "Baz"]
        };
    });

    it("should defer the interaction with provided flags", async () => {
        const deferSpy = vi.spyOn(interaction, "defer");
        const promise = createPaginatedMessage(mockPaginationOptions);

        await vi.runAllTimersAsync();
        await promise;

        expect(deferSpy).toHaveBeenCalledOnce();
        expect(deferSpy).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
    });

    it("should start on page one initially", async () => {
        const editSpy = vi.spyOn(interaction, "editOriginalMessage");
        const promise = createPaginatedMessage(mockPaginationOptions);

        await vi.runAllTimersAsync();
        await promise;

        expect(editSpy).toHaveBeenCalledTimes(2);
        expect(editSpy).toHaveBeenCalledWith({
            components: expect.any(Array),
            content: "Foo"
        });
    });

    it("should navigate through pages when a message component interaction is received", async () => {
        const initialEditSpy = vi.spyOn(interaction, "editOriginalMessage");
        vi.spyOn(interaction, "awaitMessageComponent")
            .mockResolvedValueOnce(nextInteraction);

        const nextEditSpy = vi.spyOn(nextInteraction, "editOriginalMessage");
        vi.spyOn(nextInteraction, "awaitMessageComponent")
            .mockResolvedValueOnce(nextInteraction)
            .mockResolvedValueOnce(previousInteraction);

        const previousEditSpy = vi.spyOn(previousInteraction, "editOriginalMessage");
        vi.spyOn(previousInteraction, "awaitMessageComponent")
            .mockResolvedValue(undefined);

        await createPaginatedMessage(mockPaginationOptions);

        expect(initialEditSpy).toHaveBeenCalledOnce();
        expect(initialEditSpy).toHaveBeenCalledWith({
            components: expect.any(Array),
            content: "Foo"
        });

        expect(nextEditSpy).toHaveBeenCalledTimes(2);
        expect(nextEditSpy).toHaveBeenCalledWith({
            components: expect.any(Array),
            content: "Bar"
        });
        expect(nextEditSpy).toHaveBeenLastCalledWith({
            components: expect.any(Array),
            content: "Baz"
        });

        expect(previousEditSpy).toHaveBeenCalledTimes(2);
        expect(previousEditSpy).toHaveBeenCalledWith({
            components: expect.any(Array),
            content: "Bar"
        });
    });

    it("should remove the navigation buttons when the timeout has expired", async () => {
        const editSpy = vi.spyOn(interaction, "editOriginalMessage");
        const promise = createPaginatedMessage(mockPaginationOptions);

        await vi.runAllTimersAsync();
        await promise;

        expect(editSpy).toHaveBeenCalledTimes(2);
        expect(editSpy).toHaveBeenLastCalledWith({
            components: []
        });
    });

    it("should disable the 'Previous Page' button on the first page", async () => {
        const editSpy = vi.spyOn(interaction, "editOriginalMessage");
        const promise = createPaginatedMessage(mockPaginationOptions);

        await vi.runAllTimersAsync();
        await promise;

        expect(editSpy).toHaveBeenCalledTimes(2);
        expect(editSpy).toHaveBeenCalledWith({
            components: [{
                components: [
                    expect.objectContaining({ custom_id: "previous", disabled: true }),
                    expect.objectContaining({ custom_id: "next" })
                ],
                type: ComponentType.ActionRow
            }],
            content: "Foo"
        });
    });

    it("should disable the 'Next Page' button on the last page", async () => {
        const editSpy = vi.spyOn(nextInteraction, "editOriginalMessage");

        vi.spyOn(interaction, "awaitMessageComponent")
            .mockResolvedValueOnce(nextInteraction);

        vi.spyOn(nextInteraction, "awaitMessageComponent")
            .mockResolvedValueOnce(nextInteraction)
            .mockResolvedValue(undefined);

        await createPaginatedMessage(mockPaginationOptions);

        expect(editSpy).toHaveBeenCalledTimes(3);
        expect(editSpy).toHaveBeenCalledWith({
            components: [{
                components: [
                    expect.objectContaining({ custom_id: "previous" }),
                    expect.objectContaining({ custom_id: "next", disabled: true })
                ],
                type: ComponentType.ActionRow
            }],
            content: "Baz"
        });
    });

    it("should not override existing components", async () => {
        const editSpy = vi.spyOn(interaction, "editOriginalMessage");
        const promise = createPaginatedMessage({
            ...mockPaginationOptions,
            content: ([value]) => ({
                components: [{
                    components: [],
                    type: ComponentType.ActionRow
                }],
                content: value
            })
        });

        await vi.runAllTimersAsync();
        await promise;

        expect(editSpy).toHaveBeenCalledTimes(2);
        expect(editSpy).toHaveBeenCalledWith({
            components: [
                {
                    components: [],
                    type: ComponentType.ActionRow
                },
                {
                    components: [
                        expect.objectContaining({ custom_id: "previous" }),
                        expect.objectContaining({ custom_id: "next" })
                    ],
                    type: ComponentType.ActionRow
                }
            ],
            content: "Foo"
        });
    });

    it("should override the navigation buttons if the 'buttons' option is provided", async () => {
        const editSpy = vi.spyOn(interaction, "editOriginalMessage");
        const promise = createPaginatedMessage({
            ...mockPaginationOptions,
            buttons: {
                next: {
                    label: ">"
                },
                previous: {
                    label: "<",
                    style: ButtonStyle.Danger
                }
            }
        });

        await vi.runAllTimersAsync();
        await promise;

        expect(editSpy).toHaveBeenCalledTimes(2);
        expect(editSpy).toHaveBeenCalledWith({
            components: [{
                components: [
                    expect.objectContaining({
                        custom_id: "previous",
                        label: "<",
                        style: ButtonStyle.Danger
                    }),
                    expect.objectContaining({
                        custom_id: "next",
                        label: ">",
                        style: ButtonStyle.Secondary
                    })
                ],
                type: ComponentType.ActionRow
            }],
            content: "Foo"
        });
    });
});
