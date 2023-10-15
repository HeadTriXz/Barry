import type { GatewayGuildMemberAddDispatchData } from "@discordjs/core";
import type { WelcomerSettings } from "@prisma/client";

import { mockMember, mockMessage } from "@barry/testing";
import { DiscordAPIError } from "@discordjs/rest";
import { createMockApplication } from "../../../mocks/application.js";

import GuildMemberAddEvent from "../../../../src/modules/welcomer/events/guildMemberAdd.js";
import WelcomerModule from "../../../../src/modules/welcomer/index.js";

describe("GuildMemberAdd Event", () => {
    let data: GatewayGuildMemberAddDispatchData;
    let event: GuildMemberAddEvent;
    let settings: WelcomerSettings;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new WelcomerModule(client);
        event = new GuildMemberAddEvent(module);

        data = { ...mockMember, guild_id: "68239102456844360" };
        settings = {
            channelID: "30527482987641765",
            content: "Welcome {user} to {guild}!",
            embedAuthor: null,
            embedAuthorIcon: null,
            embedColor: null,
            embedDescription: null,
            embedFooter: null,
            embedFooterIcon: null,
            embedImage: null,
            embedThumbnail: null,
            embedTimestamp: false,
            embedTitle: null,
            enabled: true,
            guildID: data.guild_id,
            withImage: false
        };

        vi.spyOn(client.api.channels, "createMessage").mockResolvedValue(mockMessage);
        vi.spyOn(module, "getContent").mockResolvedValue({
            content: "Hello World!"
        });
        vi.spyOn(module.settings, "getOrCreate").mockResolvedValue(settings);
    });

    describe("execute", () => {
        it("should log a warning if the event does not contain a user", async () => {
            delete data.user;

            await event.execute(data);

            expect(event.client.logger.warn).toHaveBeenCalledOnce();
            expect(event.client.logger.warn).toHaveBeenCalledWith("Received a 'GUILD_MEMBER_ADD' event without a user.");
        });

        it("should ignore if the guild has not enabled this module", async () => {
            settings.enabled = false;

            await event.execute(data);

            expect(event.client.api.channels.createMessage).not.toHaveBeenCalled();
        });

        it("should ignore if the guild has not set a channel", async () => {
            settings.channelID = null;

            await event.execute(data);

            expect(event.client.api.channels.createMessage).not.toHaveBeenCalled();
        });

        it("should send a welcome message", async () => {
            await event.execute(data);

            expect(event.client.api.channels.createMessage).toHaveBeenCalledOnce();
            expect(event.client.api.channels.createMessage).toHaveBeenCalledWith(settings.channelID, {
                content: "Hello World!"
            });
        });

        it("should update the settings if the channel is invalid", async () => {
            const rawError = {
                code: 10003,
                message: "Unknown channel"
            };
            const error = new DiscordAPIError(rawError, 10003, 404, "POST", "", {});
            const upsertSpy = vi.spyOn(event.module.settings, "upsert").mockResolvedValue(settings);
            vi.spyOn(event.client.api.channels, "createMessage").mockRejectedValue(error);

            await event.execute(data);

            expect(upsertSpy).toHaveBeenCalledOnce();
            expect(upsertSpy).toHaveBeenCalledWith(data.guild_id, {
                channelID: null
            });
        });

        it("should log an error if the message could not be sent", async () => {
            const error = new Error("Oh no!");
            vi.spyOn(event.client.api.channels, "createMessage").mockRejectedValue(error);

            await event.execute(data);

            expect(event.client.logger.error).toHaveBeenCalledOnce();
            expect(event.client.logger.error).toHaveBeenCalledWith(error);
        });
    });
});
