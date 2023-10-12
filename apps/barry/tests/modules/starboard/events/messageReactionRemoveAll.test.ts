import type { GatewayMessageReactionRemoveAllDispatchData } from "@discordjs/core";
import type { StarboardMessage } from "@prisma/client";

import { createMockApplication } from "../../../mocks/application.js";

import MessageReactionRemoveAllEvent from "../../../../src/modules/starboard/events/messageReactionRemoveAll.js";
import StarboardModule from "../../../../src/modules/starboard/index.js";

describe("MessageReactionRemoveAll Event", () => {
    let data: GatewayMessageReactionRemoveAllDispatchData;
    let event: MessageReactionRemoveAllEvent;
    let message: StarboardMessage;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new StarboardModule(client);
        event = new MessageReactionRemoveAllEvent(module);

        data = {
            channel_id: "30527482987641765",
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

        vi.spyOn(module.messages, "get").mockResolvedValue(message);
    });

    describe("execute", () => {
        it("should ignore if the message was sent outside a guild", async () => {
            delete data.guild_id;

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
