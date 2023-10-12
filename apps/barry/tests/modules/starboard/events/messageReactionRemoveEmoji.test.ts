import type { StarboardMessage, StarboardSettings } from "@prisma/client";
import type { GatewayMessageReactionRemoveEmojiDispatchData } from "@discordjs/core";

import { createMockApplication } from "../../../mocks/application.js";

import MessageReactionRemoveEmojiEvent from "../../../../src/modules/starboard/events/messageReactionRemoveEmoji.js";
import StarboardModule from "../../../../src/modules/starboard/index.js";

describe("MessageReactionRemove Event", () => {
    let data: GatewayMessageReactionRemoveEmojiDispatchData;
    let event: MessageReactionRemoveEmojiEvent;
    let message: StarboardMessage;
    let settings: StarboardSettings;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new StarboardModule(client);
        event = new MessageReactionRemoveEmojiEvent(module);

        data = {
            channel_id: "30527482987641765",
            emoji: { id: null, name: "\u2B50" },
            guild_id: "68239102456844360",
            message_id: "91256340920236565"
        };
        message = {
            authorID: "255022665441430550",
            channelID: "30527482987641765",
            crosspostID: "94256340520233460",
            guildID: "68239102456844360",
            messageID: "91256340920236565"
        };
        settings = {
            allowedChannels: [],
            allowedRoles: [],
            autoReactChannels: [],
            channelID: "30527482987641480",
            emojiID: null,
            emojiName: "\u2B50",
            enabled: true,
            guildID: "68239102456844360",
            ignoredChannels: [],
            ignoredRoles: [],
            threshold: 5
        };

        vi.spyOn(module.messages, "get").mockResolvedValue(message);
        vi.spyOn(module.settings, "getOrCreate").mockResolvedValue(settings);
    });

    describe("execute", () => {
        it("should ignore if the message was sent outside a guild", async () => {
            delete data.guild_id;

            await event.execute(data);

            expect(event.module.messages.get).not.toHaveBeenCalled();
        });

        it("should ignore if the deleted reactions is not the configured star emoji", async () => {
            data.emoji.name = "\u2728";

            await event.execute(data);

            expect(event.module.messages.get).not.toHaveBeenCalled();
        });

        it("should delete the starboard message if it hasn't been posted yet", async () => {
            const deleteSpy = vi.spyOn(event.module.messages, "delete");
            message.crosspostID = null;

            await event.execute(data);

            expect(deleteSpy).toHaveBeenCalledOnce();
            expect(deleteSpy).toHaveBeenCalledWith(data.channel_id, data.message_id);
        });

        it("should delete all reactions for the starboard message if it has been posted", async () => {
            const deleteSpy = vi.spyOn(event.module.reactions, "deleteAll");

            await event.execute(data);

            expect(deleteSpy).toHaveBeenCalledOnce();
            expect(deleteSpy).toHaveBeenCalledWith(data.channel_id, data.message_id);
        });
    });
});
