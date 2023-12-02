import type { GatewayMessageCreateDispatchData } from "@discordjs/core";
import type { StarboardSettings } from "@prisma/client";

import { DiscordAPIError } from "@discordjs/rest";
import { createMockApplication } from "../../../mocks/application.js";
import { mockMessage } from "@barry-bot/testing";

import MessageCreateEvent from "../../../../src/modules/starboard/events/messageCreate.js";
import StarboardModule from "../../../../src/modules/starboard/index.js";

describe("MessageCreate Event", () => {
    let data: GatewayMessageCreateDispatchData;
    let event: MessageCreateEvent;
    let settings: StarboardSettings;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new StarboardModule(client);
        event = new MessageCreateEvent(module);

        data = { ...mockMessage, guild_id: "68239102456844360" };
        settings = {
            allowedChannels: [],
            allowedRoles: [],
            autoReactChannels: [mockMessage.channel_id],
            channelID: "30527482987641480",
            emojiID: null,
            emojiName: "\u2B50",
            enabled: true,
            guildID: "68239102456844360",
            ignoredChannels: [],
            ignoredRoles: [],
            threshold: 5
        };

        vi.spyOn(client.api.channels, "addMessageReaction").mockResolvedValue(undefined);
        vi.spyOn(module, "getImage").mockReturnValue("https://example.com/image.png");
        vi.spyOn(module.settings, "getOrCreate").mockResolvedValue(settings);
    });

    describe("execute", () => {
        it("should ignore if the message was sent outside a guild", async () => {
            delete data.guild_id;

            await event.execute(data);

            expect(event.module.settings.getOrCreate).not.toHaveBeenCalled();
        });

        it("should ignore if there is no image in the message", async () => {
            const reactSpy = vi.spyOn(event.client.api.channels, "addMessageReaction");
            vi.mocked(event.module.getImage).mockReturnValue(undefined);

            await event.execute(data);

            expect(reactSpy).not.toHaveBeenCalled();
        });

        it("should ignore if the module is disabled", async () => {
            const reactSpy = vi.spyOn(event.client.api.channels, "addMessageReaction");
            settings.enabled = false;

            await event.execute(data);

            expect(reactSpy).not.toHaveBeenCalled();
        });

        it("should ignore if the message was sent outside a auto-react channel", async () => {
            const reactSpy = vi.spyOn(event.client.api.channels, "addMessageReaction");
            settings.autoReactChannels = ["30527482987641455"];

            await event.execute(data);

            expect(reactSpy).not.toHaveBeenCalled();
        });

        it("should add a reaction to the message", async () => {
            const reactSpy = vi.spyOn(event.client.api.channels, "addMessageReaction");

            await event.execute(data);

            expect(reactSpy).toHaveBeenCalledOnce();
            expect(reactSpy).toHaveBeenCalledWith(data.channel_id, data.id, "\u2B50");
        });

        it("should add a custom emoji as a reaction if configured", async () => {
            settings.emojiID = "30527482987641335";
            settings.emojiName = "cool";

            const reactSpy = vi.spyOn(event.client.api.channels, "addMessageReaction");

            await event.execute(data);

            expect(reactSpy).toHaveBeenCalledOnce();
            expect(reactSpy).toHaveBeenCalledWith(data.channel_id, data.id, "cool:30527482987641335");
        });

        it("should reset the emoji if the configured emoji does not exist", async () => {
            const rawError = {
                code: 10014,
                message: "Unknown Emoji"
            };
            const error = new DiscordAPIError(rawError, 10014, 404, "POST", "", {});
            const upsertSpy = vi.spyOn(event.module.settings, "upsert");
            vi.spyOn(event.client.api.channels, "addMessageReaction").mockRejectedValue(error);

            await event.execute(data);

            expect(upsertSpy).toHaveBeenCalledOnce();
            expect(upsertSpy).toHaveBeenCalledWith(data.guild_id, {
                emojiID: null,
                emojiName: "\u2B50"
            });
        });

        it("should log unknown errors", async () => {
            const error = new Error("Oh no!");
            vi.spyOn(event.client.api.channels, "addMessageReaction").mockRejectedValue(error);

            await event.execute(data);

            expect(event.client.logger.error).toHaveBeenCalledOnce();
            expect(event.client.logger.error).toHaveBeenCalledWith(error);
        });
    });
});
