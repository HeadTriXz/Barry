import type { GatewayVoiceState } from "@discordjs/core";

import { prisma, redis } from "../../../mocks/index.js";
import { DiscordAPIError } from "@discordjs/rest";
import { createMockApplication } from "../../../mocks/application.js";
import { mockMember } from "@barry/testing";

import LevelingModule from "../../../../src/modules/leveling/index.js";
import VoiceStateUpdateEvent from "../../../../src/modules/leveling/events/voiceStateUpdate.js";

describe("VoiceStateUpdate Event", () => {
    const channelID = "30527482987641765";
    const guildID = "68239102456844360";
    const userID = "257522665441460225";

    let event: VoiceStateUpdateEvent;
    let state: GatewayVoiceState;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new LevelingModule(client);
        event = new VoiceStateUpdateEvent(module);

        state = {
            channel_id: null,
            deaf: false,
            guild_id: guildID,
            member: mockMember,
            mute: false,
            user_id: userID,
            request_to_speak_timestamp: null,
            self_deaf: false,
            self_mute: false,
            self_video: false,
            session_id: "SESSION_ID",
            suppress: false
        };

        vi.mocked(prisma.levelingSettings.findUnique).mockResolvedValue({
            guildID: guildID,
            enabled: true,
            ignoredChannels: [],
            ignoredRoles: []
        });

        vi.mocked(prisma.memberActivity.upsert).mockResolvedValue({
            guildID: guildID,
            userID: userID,
            experience: 1520,
            level: 5,
            messageCount: 75,
            reputation: 2,
            voiceMinutes: 0
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("execute", () => {
        it("should ignore voice state updates outside a guild", async () => {
            const incrementSpy = vi.spyOn(event.module.memberActivity, "increment");
            state.guild_id = undefined;

            await event.execute(state, channelID);

            expect(incrementSpy).not.toHaveBeenCalled();
            expect(redis.set).not.toHaveBeenCalled();
        });

        it("should ignore if the user has not left, joined, or moved to a different channel", async () => {
            const incrementSpy = vi.spyOn(event.module.memberActivity, "increment");

            await event.execute({ ...state, channel_id: channelID }, channelID);

            expect(incrementSpy).not.toHaveBeenCalled();
            expect(redis.set).not.toHaveBeenCalled();
        });

        it("should set the voice start time when a user joins a voice channel", async () => {
            await event.execute({ ...state, channel_id: channelID });

            expect(redis.set).toHaveBeenCalledOnce();
        });

        it("should update voice minutes for the user when they leave a voice channel", async () => {
            vi.mocked(redis.get).mockResolvedValue("1690543918340");
            const incrementSpy = vi.spyOn(event.module.memberActivity, "increment");

            await event.execute(state, channelID);

            expect(incrementSpy).toHaveBeenCalledOnce();
            expect(incrementSpy).toHaveBeenCalledWith(guildID, userID, {
                experience: expect.any(Number),
                voiceMinutes: expect.any(Number)
            });
        });

        it("should check if the user has leveled up if the previous channel is known", async () => {
            vi.mocked(redis.get).mockResolvedValue("1690543918340");
            const checkLevelSpy = vi.spyOn(event.module, "checkLevel");
            const incrementSpy = vi.spyOn(event.module.memberActivity, "increment");

            await event.execute(state, channelID);

            expect(checkLevelSpy).toHaveBeenCalledOnce();
            expect(incrementSpy).toHaveBeenCalledOnce();
        });

        it("should not check if the user has leveled up if the previous channel is unknown", async () => {
            vi.mocked(redis.get).mockResolvedValue("1690543918340");
            const checkLevelSpy = vi.spyOn(event.module, "checkLevel");
            const incrementSpy = vi.spyOn(event.module.memberActivity, "increment");

            await event.execute(state);

            expect(checkLevelSpy).not.toHaveBeenCalled();
            expect(incrementSpy).toHaveBeenCalledOnce();
        });

        it("should not update voice minutes if the channel is blacklisted", async () => {
            vi.mocked(prisma.levelingSettings.findUnique).mockResolvedValue({
                guildID: guildID,
                enabled: true,
                ignoredChannels: [channelID],
                ignoredRoles: []
            });
            const incrementSpy = vi.spyOn(event.module.memberActivity, "increment");

            await event.execute(state, channelID);

            expect(incrementSpy).not.toHaveBeenCalled();
        });

        it("should not update voice minutes if the user has a blacklisted role", async () => {
            state.member = { ...mockMember, roles: ["68239102456844360"] };

            vi.mocked(prisma.levelingSettings.findUnique).mockResolvedValue({
                guildID: guildID,
                enabled: true,
                ignoredChannels: [],
                ignoredRoles: ["68239102456844360"]
            });
            const incrementSpy = vi.spyOn(event.module.memberActivity, "increment");

            await event.execute(state, channelID);

            expect(incrementSpy).not.toHaveBeenCalled();
        });

        it("should not update voice minutes if the start time is not cached", async () => {
            vi.mocked(redis.get).mockResolvedValue(null);
            const incrementSpy = vi.spyOn(event.module.memberActivity, "increment");

            await event.execute(state, channelID);

            expect(incrementSpy).not.toHaveBeenCalled();
        });

        it("should ignore 'Cannot send messages to this user' errors", async () => {
            const response = {
                code: 50007,
                message: "Cannot send messages to this user"
            };

            const error = new DiscordAPIError(response, 50007, 200, "GET", "", {});

            vi.mocked(redis.get).mockResolvedValue("1690543918340");
            vi.spyOn(event.module, "checkLevel").mockRejectedValue(error);

            await event.execute(state, channelID);

            expect(event.client.logger.error).not.toHaveBeenCalledOnce();
        });

        it("should handle errors during execution", async () => {
            vi.mocked(redis.get).mockResolvedValue("1690543918340");
            vi.spyOn(event.module, "checkLevel").mockRejectedValue(new Error("Oh no!"));

            await event.execute(state, channelID);

            expect(event.client.logger.error).toHaveBeenCalledOnce();
        });
    });
});
