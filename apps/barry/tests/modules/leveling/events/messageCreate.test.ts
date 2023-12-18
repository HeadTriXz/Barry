import type { GatewayMessageCreateDispatchData } from "@discordjs/core";

import {
    mockMember,
    mockMessage,
    mockUser
} from "@barry-bot/testing";

import { DiscordAPIError } from "@discordjs/rest";
import { createMockApplication } from "../../../mocks/application.js";

import LevelingModule from "../../../../src/modules/leveling/index.js";
import MessageCreateEvent from "../../../../src/modules/leveling/events/messageCreate.js";

describe("MessageCreate Event", () => {
    const guildID = "68239102456844360";
    const userID = "257522665441460225";

    let event: MessageCreateEvent;
    let message: GatewayMessageCreateDispatchData;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new LevelingModule(client);
        event = new MessageCreateEvent(module);

        message = {
            ...mockMessage,
            guild_id: "68239102456844360",
            member: mockMember
        };

        vi.spyOn(module.settings, "getOrCreate").mockResolvedValue({
            guildID: guildID,
            enabled: true,
            ignoredChannels: [],
            ignoredRoles: [],
            messageRep: true
        });

        vi.spyOn(module.memberActivity, "upsert").mockResolvedValue({
            guildID: guildID,
            userID: userID,
            experience: 1520,
            level: 5,
            messageCount: 75,
            reputation: 2,
            voiceMinutes: 0
        });

        vi.spyOn(client.api.channels, "createMessage").mockResolvedValue(mockMessage);
    });

    describe("execute", () => {
        it("should ignore messages from bot accounts", async () => {
            message.author = { ...mockUser, bot: true };

            await event.execute(message);

            expect(event.module.memberActivity.upsert).not.toHaveBeenCalled();
        });

        it("should ignore messages outside a guild", async () => {
            message.guild_id = undefined;

            await event.execute(message);

            expect(event.module.memberActivity.upsert).not.toHaveBeenCalled();
        });

        it("should add experience if the user is not on cooldown", async () => {
            const incrementSpy = vi.spyOn(event.module.memberActivity, "increment");

            await event.execute(message);

            expect(incrementSpy).toHaveBeenCalledOnce();
            expect(incrementSpy).toHaveBeenCalledWith(guildID, userID, {
                experience: expect.any(Number),
                messageCount: 1
            });
        });

        it("should not add experience if the user is on cooldown", async () => {
            const incrementSpy = vi.spyOn(event.module.memberActivity, "increment");

            await event.execute(message);
            await event.execute(message);

            expect(incrementSpy).toHaveBeenCalledOnce();
        });

        it("should not add experience if the message was sent in a blacklisted channel", async () => {
            vi.mocked(event.module.settings.getOrCreate).mockResolvedValue({
                guildID: guildID,
                enabled: true,
                ignoredChannels: ["30527482987641765"],
                ignoredRoles: [],
                messageRep: false
            });

            await event.execute(message);

            expect(event.module.memberActivity.upsert).not.toHaveBeenCalled();
        });

        it("should not add experience if the message was sent by a user with a blacklisted role", async () => {
            message.member = { ...mockMember, roles: ["68239102456844360"] };

            vi.mocked(event.module.settings.getOrCreate).mockResolvedValue({
                guildID: guildID,
                enabled: true,
                ignoredChannels: [],
                ignoredRoles: ["68239102456844360"],
                messageRep: false
            });

            await event.execute(message);

            expect(event.module.memberActivity.upsert).not.toHaveBeenCalled();
        });

        it("should check if the user has leveled up", async () => {
            const checkLevelSpy = vi.spyOn(event.module, "checkLevel").mockResolvedValue(undefined);

            await event.execute(message);

            expect(checkLevelSpy).toHaveBeenCalledOnce();
        });

        it("should ignore 'Cannot send messages to this user' errors", async () => {
            const response = {
                code: 50007,
                message: "Cannot send messages to this user"
            };

            const error = new DiscordAPIError(response, 50007, 200, "GET", "", {});
            vi.spyOn(event.module, "checkLevel").mockRejectedValue(error);

            await event.execute(message);

            expect(event.client.logger.error).not.toHaveBeenCalled();
        });

        it("should handle errors during execution to prevent cooldowns not being set", async () => {
            const cooldownSpy = vi.spyOn(event.client.cooldowns, "set");

            vi.spyOn(event.module, "checkLevel").mockRejectedValue(new Error("Oh no!"));

            await event.execute(message);

            expect(event.client.logger.error).toHaveBeenCalledOnce();
            expect(cooldownSpy).toHaveBeenCalledOnce();
        });

        it("should add reputation if the message contains a 'thank you'", async () => {
            message.content = "Thank you!";
            message.mentions = [{ ...mockUser, id: "30527482987641765" }];

            const incrementSpy = vi.spyOn(event.module.memberActivity, "increment");

            await event.execute(message);

            expect(incrementSpy).toHaveBeenCalledTimes(2);
            expect(incrementSpy).toHaveBeenCalledWith(guildID, "30527482987641765", {
                reputation: 1
            });
        });

        it("should add reputation if the message replies to a user", async () => {
            message.content = "Thank you!";
            message.mentions = [];
            message.referenced_message = {
                ...mockMessage,
                author: { ...mockUser, id: "30527482987641765" }
            };

            const incrementSpy = vi.spyOn(event.module.memberActivity, "increment");

            await event.execute(message);

            expect(incrementSpy).toHaveBeenCalledTimes(2);
            expect(incrementSpy).toHaveBeenCalledWith(guildID, "30527482987641765", {
                reputation: 1
            });
        });

        it("should not add reputation if the message does not contain a 'thank you'", async () => {
            message.content = "Hello!";
            message.mentions = [{ ...mockUser, id: "30527482987641765" }];

            const incrementSpy = vi.spyOn(event.module.memberActivity, "increment");

            await event.execute(message);

            expect(incrementSpy).not.toHaveBeenCalledTimes(2);
            expect(incrementSpy).not.toHaveBeenCalledWith(guildID, "30527482987641765", {
                reputation: 1
            });
        });

        it("should not add reputation if the user is on cooldown", async () => {
            message.content = "Thank you!";
            message.mentions = [{ ...mockUser, id: "30527482987641765" }];

            const incrementSpy = vi.spyOn(event.module.memberActivity, "increment");

            await event.execute(message);
            await event.execute(message);

            expect(incrementSpy).not.toHaveBeenCalledTimes(3);
        });

        it("should not add reputation if the user mentioned themselves", async () => {
            message.content = "Thank you!";
            message.mentions = [{ ...mockUser, id: userID }];

            const incrementSpy = vi.spyOn(event.module.memberActivity, "increment");

            await event.execute(message);

            expect(incrementSpy).not.toHaveBeenCalledTimes(2);
            expect(incrementSpy).not.toHaveBeenCalledWith(guildID, userID, {
                reputation: 1
            });
        });

        it("should not add reputation if the user mentioned a bot", async () => {
            message.content = "Thank you!";
            message.mentions = [{ ...mockUser, bot: true, id: "30527482987641765" }];

            const incrementSpy = vi.spyOn(event.module.memberActivity, "increment");

            await event.execute(message);

            expect(incrementSpy).not.toHaveBeenCalledTimes(2);
            expect(incrementSpy).not.toHaveBeenCalledWith(guildID, "30527482987641765", {
                reputation: 1
            });
        });

        it("should not add reputation if message reputation is disabled", async () => {
            message.content = "Thank you!";
            message.mentions = [{ ...mockUser, id: "30527482987641765" }];

            vi.mocked(event.module.settings.getOrCreate).mockResolvedValue({
                guildID: guildID,
                enabled: true,
                ignoredChannels: [],
                ignoredRoles: [],
                messageRep: false
            });

            const incrementSpy = vi.spyOn(event.module.memberActivity, "increment");

            await event.execute(message);

            expect(incrementSpy).not.toHaveBeenCalledTimes(2);
            expect(incrementSpy).not.toHaveBeenCalledWith(guildID, "30527482987641765", {
                reputation: 1
            });
        });
    });
});
