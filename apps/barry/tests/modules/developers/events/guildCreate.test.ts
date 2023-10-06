import { createMockApplication } from "../../../mocks/application.js";
import { mockGuild } from "@barry/testing";
import DevelopersModule from "../../../../src/modules/developers/index.js";
import GuildCreateEvent from "../../../../src/modules/developers/events/guildCreate.js";

describe("GuildCreate Event", () => {
    let event: GuildCreateEvent;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new DevelopersModule(client);
        event = new GuildCreateEvent(module);

        vi.spyOn(event.client.api.users, "leaveGuild").mockResolvedValue(undefined);
    });

    describe("execute", () => {
        it("should leave the guild if it is blacklisted", async () => {
            vi.spyOn(event.module.blacklistedGuilds, "isBlacklisted").mockResolvedValue(true);

            await event.execute(mockGuild);

            expect(event.client.api.users.leaveGuild).toHaveBeenCalledOnce();
            expect(event.client.api.users.leaveGuild).toHaveBeenCalledWith(mockGuild.id);
        });

        it("should not leave the guild if it is not blacklisted", async () => {
            vi.spyOn(event.module.blacklistedGuilds, "isBlacklisted").mockResolvedValue(false);

            await event.execute(mockGuild);

            expect(event.client.api.users.leaveGuild).not.toHaveBeenCalled();
        });
    });
});
