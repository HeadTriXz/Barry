import { type API, GatewayDispatchEvents, InteractionResponseType } from "@discordjs/core";

import { Client, InteractionFactory, ReplyableInteraction } from "../../src/index.js";
import {
    createMockApplicationCommandInteraction,
    createMockMessageComponentInteraction,
    createMockModalSubmitInteraction
} from "@barry/testing";

describe("ReplyableInteraction", () => {
    let client: Client;

    beforeEach(() => {
        client = new Client({
            applicationID: "49072635294295155",
            api: {
                webhooks: {
                    deleteMessage: vi.fn(),
                    editMessage: vi.fn().mockResolvedValue({
                        content: "Hello World",
                        id: "91256340920236565"
                    }),
                    execute: vi.fn().mockResolvedValue({
                        content: "Hello World",
                        id: "91256340920236565"
                    }),
                    getMessage: vi.fn().mockResolvedValue({
                        content: "Hello World",
                        id: "91256340920236565"
                    })
                }
            } as unknown as API
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("awaitMessageComponent", () => {
        let interaction: ReplyableInteraction;

        beforeEach(() => {
            interaction = new ReplyableInteraction(createMockApplicationCommandInteraction(), client, vi.fn());
        });

        it("should stop listening for interactions once matched", async () => {
            const offSpy = vi.spyOn(client, "off");

            const data = createMockMessageComponentInteraction();
            const response = InteractionFactory.from(data, client);
            const promise = interaction.awaitMessageComponent({
                customIDs: ["button"],
                messageID: "91256340920236565"
            });

            client.emit(GatewayDispatchEvents.InteractionCreate, response);

            await expect(promise).resolves.toBe(response);
            expect(offSpy).toHaveBeenCalledOnce();
        });

        it("should ignore interactions that are not of type 'MessageComponent'", async () => {
            vi.useFakeTimers();

            const offSpy = vi.spyOn(client, "off");

            const data = createMockApplicationCommandInteraction();
            const response = InteractionFactory.from(data, client);
            const promise = interaction.awaitMessageComponent({
                customIDs: ["button"],
                messageID: "91256340920236565",
                timeout: 2000
            });

            client.emit(GatewayDispatchEvents.InteractionCreate, response);
            vi.advanceTimersByTime(3000);

            await expect(promise).resolves.toBeUndefined();
            expect(offSpy).toHaveBeenCalledOnce();
        });

        describe("'messageID' option", () => {
            it("should use the initial response's message ID if 'messageID' is undefined", async () => {
                await interaction.getOriginalMessage();

                const data = createMockMessageComponentInteraction();
                const response = InteractionFactory.from(data, client);
                const promise = interaction.awaitMessageComponent({ customIDs: ["button"] });

                client.emit(GatewayDispatchEvents.InteractionCreate, response);

                await expect(promise).resolves.toBe(response);
            });

            it("should fetch the original message if 'messageID' is undefined", async () => {
                await interaction.createMessage({
                    content: "Hello World"
                });

                const data = createMockMessageComponentInteraction();
                const response = InteractionFactory.from(data, client);
                const promise = interaction.awaitMessageComponent({ customIDs: ["button"] });

                client.emit(GatewayDispatchEvents.InteractionCreate, response);

                await expect(promise).resolves.toBe(response);
            });

            it("should throw an error if the interaction has no initial response", async () => {
                const data = createMockMessageComponentInteraction();
                const response = InteractionFactory.from(data, client);
                const promise = interaction.awaitMessageComponent({ customIDs: ["button"] });

                client.emit(GatewayDispatchEvents.InteractionCreate, response);

                await expect(promise).rejects.toThrowError(
                    "You must send an initial response before listening for components."
                );
            });
        });

        describe("'customIDs' option", () => {
            it("should resolve if the custom ID matches on of the provided 'customIDs'", async () => {
                const data = createMockMessageComponentInteraction();
                const response = InteractionFactory.from(data, client);
                const promise = interaction.awaitMessageComponent({
                    customIDs: ["button", "not-button"],
                    messageID: "91256340920236565"
                });

                client.emit(GatewayDispatchEvents.InteractionCreate, response);

                await expect(promise).resolves.toBe(response);
            });

            it("should ignore if the custom ID does not match one of the provided 'customIDs'", async () => {
                vi.useFakeTimers();

                const data = createMockMessageComponentInteraction();
                const response = InteractionFactory.from(data, client);
                const promise = interaction.awaitMessageComponent({
                    customIDs: ["not-a-button", "fake-button"],
                    messageID: "91256340920236565"
                });

                client.emit(GatewayDispatchEvents.InteractionCreate, response);
                vi.runAllTimers();

                await expect(promise).resolves.toBeUndefined();
            });

            it("should allow any custom ID if 'customIDs' has no items", async () => {
                const data = createMockMessageComponentInteraction();
                const response = InteractionFactory.from(data, client);
                const promise = interaction.awaitMessageComponent({
                    customIDs: [],
                    messageID: "91256340920236565"
                });

                client.emit(GatewayDispatchEvents.InteractionCreate, response);

                await expect(promise).resolves.toBe(response);
            });

            it("should allow any custom ID if 'customIDs' is undefined", async () => {
                const data = createMockMessageComponentInteraction();
                const response = InteractionFactory.from(data, client);
                const promise = interaction.awaitMessageComponent({
                    messageID: "91256340920236565"
                });

                client.emit(GatewayDispatchEvents.InteractionCreate, response);

                await expect(promise).resolves.toBe(response);
            });
        });

        describe("'userID' option", () => {
            it("should resolve if the user ID matches the provided 'userID' option", async () => {
                const data = createMockMessageComponentInteraction();
                const response = InteractionFactory.from(data, client);
                const promise = interaction.awaitMessageComponent({
                    customIDs: ["button"],
                    messageID: "91256340920236565",
                    userID: "257522665441460225"
                });

                client.emit(GatewayDispatchEvents.InteractionCreate, response);

                await expect(promise).resolves.toBe(response);
            });

            it("should ignore if the user ID does not match the provided 'userID' option", async () => {
                vi.useFakeTimers();

                const data = createMockMessageComponentInteraction();
                const response = InteractionFactory.from(data, client);
                const promise = interaction.awaitMessageComponent({
                    customIDs: ["button"],
                    messageID: "91256340920236565",
                    userID: "257522665437265920"
                });

                client.emit(GatewayDispatchEvents.InteractionCreate, response);
                vi.runAllTimers();

                await expect(promise).resolves.toBeUndefined();
            });

            it("should allow any ID if 'userID' is null", async () => {
                const data = createMockMessageComponentInteraction();
                const response = InteractionFactory.from(data, client);
                const promise = interaction.awaitMessageComponent({
                    customIDs: ["button"],
                    messageID: "91256340920236565",
                    userID: undefined
                });

                client.emit(GatewayDispatchEvents.InteractionCreate, response);

                await expect(promise).resolves.toBe(response);
            });
        });

        describe("'timeout' option", () => {
            it("should resolve with undefined if the timeout is reached", async () => {
                vi.useFakeTimers();

                const offSpy = vi.spyOn(client, "off");
                const promise = interaction.awaitMessageComponent({
                    customIDs: ["button"],
                    messageID: "91256340920236565",
                    timeout: 2000
                });

                vi.advanceTimersByTime(3000);

                await expect(promise).resolves.toBeUndefined();
                expect(offSpy).toHaveBeenCalledOnce();
            });
        });
    });

    describe("awaitModalSubmit", () => {
        let interaction: ReplyableInteraction;

        beforeEach(() => {
            interaction = new ReplyableInteraction(createMockApplicationCommandInteraction(), client);
        });

        it("should resolve with the matching interaction when found", async () => {
            const offSpy = vi.spyOn(client, "off");
            const response = InteractionFactory.from(createMockModalSubmitInteraction(), client);
            const promise = interaction.awaitModalSubmit("modal");

            client.emit(GatewayDispatchEvents.InteractionCreate, response);

            await expect(promise).resolves.toBe(response);
            expect(offSpy).toHaveBeenCalledOnce();
        });

        it("should resolve with undefined if the timeout is reached", async () => {
            vi.useFakeTimers();

            const offSpy = vi.spyOn(client, "off");
            const promise = interaction.awaitModalSubmit("modal", 2000);

            vi.advanceTimersByTime(3000);

            await expect(promise).resolves.toBeUndefined();
            expect(offSpy).toHaveBeenCalledOnce();
        });

        it("should ignore interactions that are not of type 'ModalSubmit'", async () => {
            vi.useFakeTimers();

            const offSpy = vi.spyOn(client, "off");

            const data = createMockApplicationCommandInteraction();
            const response = InteractionFactory.from(data, client);
            const promise = interaction.awaitModalSubmit("modal", 2000);

            client.emit(GatewayDispatchEvents.InteractionCreate, response);
            vi.advanceTimersByTime(3000);

            await expect(promise).resolves.toBeUndefined();
            expect(offSpy).toHaveBeenCalledOnce();
        });
    });

    describe("createFollowupMessage", () => {
        it("should execute the webhook and return the message", async () => {
            const data = createMockApplicationCommandInteraction();
            const interaction = new ReplyableInteraction(data, client);

            const message = await interaction.createFollowupMessage({
                content: "Hello World"
            });

            expect(client.api.webhooks.execute).toHaveBeenCalledOnce();
            expect(client.api.webhooks.execute).toHaveBeenCalledWith(interaction.applicationID, interaction.token, {
                content: "Hello World",
                wait: true
            });
            expect(message).toEqual({
                content: "Hello World",
                id: "91256340920236565"
            });
        });
    });

    describe("createMessage", () => {
        const messageOptions = {
            content: "Hello World"
        };

        it("should call the response handler if not already acknowledged", async () => {
            const respond = vi.fn();
            const data = createMockApplicationCommandInteraction();
            const interaction = new ReplyableInteraction(data, client, respond);

            await interaction.createMessage(messageOptions);

            expect(interaction.acknowledged).toBe(true);
            expect(respond).toHaveBeenCalledOnce();
            expect(respond).toHaveBeenCalledWith({
                body: {
                    type: InteractionResponseType.ChannelMessageWithSource,
                    data: messageOptions
                }
            });
        });

        it("should call createFollowupMessage if already acknowledged", async () => {
            const respond = vi.fn();
            const data = createMockApplicationCommandInteraction();
            const interaction = new ReplyableInteraction(data, client, respond);
            const createFollowupMessageSpy = vi.spyOn(interaction, "createFollowupMessage");

            interaction.acknowledged = true;
            await interaction.createMessage(messageOptions);

            expect(respond).not.toHaveBeenCalled();
            expect(createFollowupMessageSpy).toHaveBeenCalledOnce();
            expect(createFollowupMessageSpy).toHaveBeenCalledWith(messageOptions);
        });
    });

    describe("createModal", () => {
        const modalOptions = {
            components: [],
            custom_id: "modal",
            title: "Modal"
        };

        it("should call the response handler if not already acknowledged", async () => {
            const respond = vi.fn();
            const data = createMockApplicationCommandInteraction();
            const interaction = new ReplyableInteraction(data, client, respond);

            await interaction.createModal(modalOptions);

            expect(interaction.acknowledged).toBe(true);
            expect(respond).toHaveBeenCalledOnce();
            expect(respond).toHaveBeenCalledWith({
                body: {
                    type: InteractionResponseType.Modal,
                    data: modalOptions
                }
            });
        });

        it("should throw an error if the interaction has already been acknowledged", async () => {
            const data = createMockApplicationCommandInteraction();
            const interaction = new ReplyableInteraction(data, client, vi.fn());

            interaction.acknowledged = true;

            await expect(() => interaction.createModal(modalOptions)).rejects.toThrowError(
                "You have already acknowledged this interaction."
            );
        });
    });

    describe("defer", () => {
        it("should call the response handler if not already acknowledged", async () => {
            const respond = vi.fn();
            const data = createMockApplicationCommandInteraction();
            const interaction = new ReplyableInteraction(data, client, respond);

            await interaction.defer();

            expect(interaction.acknowledged).toBe(true);
            expect(respond).toHaveBeenCalledOnce();
            expect(respond).toHaveBeenCalledWith({
                body: {
                    type: InteractionResponseType.DeferredChannelMessageWithSource
                }
            });
        });

        it("should throw an error if the interaction has already been acknowledged", async () => {
            const data = createMockApplicationCommandInteraction();
            const interaction = new ReplyableInteraction(data, client, vi.fn());

            interaction.acknowledged = true;

            await expect(() => interaction.defer()).rejects.toThrowError(
                "You have already acknowledged this interaction."
            );
        });
    });

    describe("deleteFollowupMessage", () => {
        it("should delete the webhook message", async () => {
            const data = createMockApplicationCommandInteraction();
            const interaction = new ReplyableInteraction(data, client);

            await interaction.deleteFollowupMessage("91256340920236565");

            expect(client.api.webhooks.deleteMessage).toHaveBeenCalledOnce();
        });
    });

    describe("deleteOriginalMessage", () => {
        it("should delete the original webhook message", async () => {
            const data = createMockApplicationCommandInteraction();
            const interaction = new ReplyableInteraction(data, client);

            await interaction.deleteOriginalMessage();

            expect(client.api.webhooks.deleteMessage).toHaveBeenCalledWith(
                interaction.applicationID,
                interaction.token,
                "@original"
            );
        });
    });

    describe("editFollowupMessage", () => {
        it("should edit the webhook message and return the updated message", async () => {
            const data = createMockApplicationCommandInteraction();
            const interaction = new ReplyableInteraction(data, client);

            const message = await interaction.editFollowupMessage("91256340920236565", {
                content: "Hello World"
            });

            expect(client.api.webhooks.editMessage).toHaveBeenCalledOnce();
            expect(message).toEqual({
                content: "Hello World",
                id: "91256340920236565"
            });
        });
    });

    describe("editOriginalMessage", () => {
        it("should edit the original webhook message and return the updated message", async () => {
            const options = { content: "Hello World" };
            const data = createMockApplicationCommandInteraction();
            const interaction = new ReplyableInteraction(data, client);

            const message = await interaction.editOriginalMessage(options);

            expect(client.api.webhooks.editMessage).toHaveBeenCalledWith(
                interaction.applicationID,
                interaction.token,
                "@original",
                options
            );
            expect(message).toEqual({
                content: "Hello World",
                id: "91256340920236565"
            });
        });
    });

    describe("getFollowupMessage", () => {
        it("should return the webhook message", async () => {
            const data = createMockApplicationCommandInteraction();
            const interaction = new ReplyableInteraction(data, client);
            const message = await interaction.getFollowupMessage("91256340920236565");

            expect(client.api.webhooks.getMessage).toHaveBeenCalledOnce();
            expect(message).toEqual({
                content: "Hello World",
                id: "91256340920236565"
            });
        });
    });

    describe("getOriginalMessage", () => {
        it("should return the original webhook message", async () => {
            const data = createMockApplicationCommandInteraction();
            const interaction = new ReplyableInteraction(data, client);
            const message = await interaction.getOriginalMessage();

            expect(client.api.webhooks.getMessage).toHaveBeenCalledWith(
                interaction.applicationID,
                interaction.token,
                "@original"
            );
            expect(message).toEqual({
                content: "Hello World",
                id: "91256340920236565"
            });
        });
    });
});
