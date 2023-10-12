import type { GatewayMessageReactionRemoveDispatchData } from "@discordjs/core";

import { createMockApplication } from "../../../mocks/application.js";

import MessageReactionRemoveEvent from "../../../../src/modules/starboard/events/messageReactionRemove.js";
import StarboardModule from "../../../../src/modules/starboard/index.js";

describe("MessageReactionRemove Event", () => {
    let data: GatewayMessageReactionRemoveDispatchData;
    let event: MessageReactionRemoveEvent;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new StarboardModule(client);
        event = new MessageReactionRemoveEvent(module);

        data = {
            channel_id: "30527482987641765",
            emoji: { id: null, name: "\u2B50" },
            guild_id: "68239102456844360",
            message_id: "91256340920236565",
            user_id: "255022665441430550"
        };

        module.updateMessage = vi.fn();
    });

    describe("execute", () => {
        it("should ignore if the reaction is outside a guild", async () => {
            delete data.guild_id;

            await event.execute(data);

            expect(event.module.updateMessage).not.toHaveBeenCalled();
        });

        it("should update the starboard message", async () => {
            await event.execute(data);

            expect(event.module.updateMessage).toHaveBeenCalledOnce();
            expect(event.module.updateMessage).toHaveBeenCalledWith({
                channelID: data.channel_id,
                emoji: data.emoji,
                guildID: data.guild_id,
                messageID: data.message_id,
                userID: data.user_id
            });
        });
    });
});
