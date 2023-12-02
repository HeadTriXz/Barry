import { type APIMessage, MessageFlags } from "@discordjs/core";

import {
    createMockApplicationCommandInteraction,
    mockMessage,
    mockUser
} from "@barry-bot/testing";
import { ApplicationCommandInteraction } from "@barry-bot/core";
import { createMockApplication } from "../../../../../mocks/index.js";

import PurgeCommand, { type PurgeOptions } from "../../../../../../src/modules/moderation/commands/chatinput/purge/index.js";
import ModerationModule from "../../../../../../src/modules/moderation/index.js";
import * as core from "@barry-bot/core";

describe("/purge", () => {
    let command: PurgeCommand;
    let interaction: ApplicationCommandInteraction;
    let options: PurgeOptions;

    let messageIDs: string[];
    let messages: APIMessage[];

    beforeEach(() => {
        const client = createMockApplication();
        const module = new ModerationModule(client);
        command = new PurgeCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client, vi.fn());

        options = {
            amount: 10
        };

        messageIDs = [
            "30527482987641765",
            "30527482987641766",
            "30527482987641767",
            "30527482987641768",
            "30527482987641769",
            "30527482987641770",
            "30527482987641771",
            "30527482987641772",
            "30527482987641773",
            "30527482987641774"
        ];
        messages = messageIDs.map((id) => ({
            ...mockMessage, id
        }));

        client.api.channels.bulkDeleteMessages = vi.fn();
        client.api.channels.deleteMessage = vi.fn();
        vi.spyOn(client.api.channels, "getMessages").mockResolvedValue(messages);
        vi.spyOn(core, "getCreatedAt").mockReturnValue(Date.now());
    });

    describe("execute", () => {
        it("should purge messages from the current channel", async () => {
            const deleteSpy = vi.spyOn(command.client.api.channels, "bulkDeleteMessages");

            await command.execute(interaction, options);

            expect(deleteSpy).toHaveBeenCalledOnce();
            expect(deleteSpy).toHaveBeenCalledWith(interaction.channel?.id, expect.any(Array));
        });

        it("should purge messages from the current channel from a user", async () => {
            const deleteSpy = vi.spyOn(command.client.api.channels, "bulkDeleteMessages");
            messages.splice(3);
            options.user = mockUser;

            await command.execute(interaction, options);

            expect(deleteSpy).toHaveBeenCalledOnce();
            expect(deleteSpy).toHaveBeenCalledWith(interaction.channel?.id, messageIDs.slice(0, 3));
        });

        it("should only delete one message if the amount is '1'", async () => {
            const deleteSpy = vi.spyOn(command.client.api.channels, "deleteMessage");
            options.amount = 1;

            await command.execute(interaction, options);

            expect(deleteSpy).toHaveBeenCalledOnce();
            expect(deleteSpy).toHaveBeenCalledWith(interaction.channel?.id, messageIDs[0]);
        });

        it("should show an error message if no messages are found", async () => {
            vi.spyOn(command.client.api.channels, "getMessages").mockResolvedValue([]);
            const createSpy = vi.spyOn(interaction, "createMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("There are no messages to purge."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should show an error message if an error occurs", async () => {
            const error = new Error("Oh no!");
            const createSpy = vi.spyOn(interaction, "createMessage");
            vi.spyOn(command.client.api.channels, "bulkDeleteMessages").mockRejectedValue(error);

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("Failed to purge the messages."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should log the error if an error occurs", async () => {
            const error = new Error("Oh no!");
            vi.spyOn(command.client.api.channels, "bulkDeleteMessages").mockRejectedValue(error);

            await command.execute(interaction, options);

            expect(command.client.logger.error).toHaveBeenCalledOnce();
            expect(command.client.logger.error).toHaveBeenCalledWith(error);
        });

        it("should show a success message if the messages are purged", async () => {
            const createSpy = vi.spyOn(interaction, "createMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("Successfully deleted 10 messages"),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should ignore if the interaction was invoked outside a guild", async () => {
            delete interaction.guildID;

            await command.execute(interaction, options);

            expect(interaction.acknowledged).toBe(false);
        });

        it("should ignore if the interaction was invoked outside a channel", async () => {
            delete interaction.channel;

            await command.execute(interaction, options);

            expect(interaction.acknowledged).toBe(false);
        });
    });

    describe("isPrunable", () => {
        it("should return false if the message is pinned", () => {
            const message = { ...mockMessage, pinned: true };

            const result = command.isPrunable(message);

            expect(result).toBe(false);
        });

        it("should return false if the message is older than 14 days", () => {
            vi.spyOn(core, "getCreatedAt").mockReturnValue(Date.now() - 1382400000);

            const result = command.isPrunable(mockMessage);

            expect(result).toBe(false);
        });

        it("should return false if the message is not from the requested user", () => {
            const result = command.isPrunable(mockMessage, "257522665458237440");

            expect(result).toBe(false);
        });

        it("should return true if the message meets all requirements", () => {
            const result = command.isPrunable(mockMessage);

            expect(result).toBe(true);
        });
    });
});
