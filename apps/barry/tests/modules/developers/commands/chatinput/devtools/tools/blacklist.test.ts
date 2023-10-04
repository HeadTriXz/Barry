import {
    MessageComponentInteraction,
    ModalSubmitInteraction,
    UpdatableInteraction
} from "@barry/core";
import { blacklistGuild, blacklistUser } from "../../../../../../../src/modules/developers/commands/chatinput/devtools/tools/blacklist.js";
import {
    createMockMessageComponentInteraction,
    createMockModalSubmitInteraction,
    mockGuild,
    mockUser
} from "@barry/testing";

import { ComponentType } from "@discordjs/core";
import { DiscordAPIError } from "@discordjs/rest";
import { createMockApplication } from "../../../../../../mocks/application.js";
import { timeoutContent } from "../../../../../../../src/modules/marketplace/constants.js";

import DevelopersModule from "../../../../../../../src/modules/developers/index.js";

describe("blacklistGuild", () => {
    let interaction: UpdatableInteraction;
    let module: DevelopersModule;
    let response: ModalSubmitInteraction;

    beforeEach(() => {
        vi.useFakeTimers().setSystemTime("01-01-2023");

        const client = createMockApplication();
        module = new DevelopersModule(client);

        const data = createMockMessageComponentInteraction();
        interaction = new UpdatableInteraction(data, client, vi.fn());
        interaction.editParent = vi.fn();

        const responseData = createMockModalSubmitInteraction({
            components: [{
                components: [{
                    custom_id: "guild",
                    type: ComponentType.TextInput,
                    value: mockGuild.id
                }],
                type: ComponentType.ActionRow
            }],
            custom_id: `blacklist-guild-${Date.now()}`
        });
        response = new ModalSubmitInteraction(responseData, client, vi.fn());
        response.editParent = vi.fn();

        module.blacklistedGuilds.blacklist = vi.fn();
        vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(response);
        vi.spyOn(client.api.guilds, "get").mockResolvedValue(mockGuild);
        vi.spyOn(client.api.users, "leaveGuild").mockResolvedValue();
    });

    it("should blacklist the guild", async () => {
        vi.spyOn(module.blacklistedGuilds, "isBlacklisted").mockResolvedValue(false);

        await blacklistGuild(module, interaction);

        expect(module.blacklistedGuilds.blacklist).toHaveBeenCalledOnce();
        expect(module.blacklistedGuilds.blacklist).toHaveBeenCalledWith(mockGuild.id);
    });

    it("should leave the guild", async () => {
        vi.spyOn(module.blacklistedGuilds, "isBlacklisted").mockResolvedValue(false);

        await blacklistGuild(module, interaction);

        expect(module.client.api.users.leaveGuild).toHaveBeenCalledOnce();
        expect(module.client.api.users.leaveGuild).toHaveBeenCalledWith(mockGuild.id);
    });

    it("should send a success message", async () => {
        vi.spyOn(module.blacklistedGuilds, "isBlacklisted").mockResolvedValue(false);

        await blacklistGuild(module, interaction);

        expect(response.editParent).toHaveBeenCalledOnce();
        expect(response.editParent).toHaveBeenCalledWith({
            components: [],
            content: expect.stringContaining(`Successfully blacklisted \`${mockGuild.name}\`.`)
        });
    });

    it("should show an error message if the guild is already blacklisted", async () => {
        vi.spyOn(module.blacklistedGuilds, "isBlacklisted").mockResolvedValue(true);

        await blacklistGuild(module, interaction);

        expect(response.editParent).toHaveBeenCalledOnce();
        expect(response.editParent).toHaveBeenCalledWith({
            components: [],
            content: expect.stringContaining("The guild you provided is already blacklisted.")
        });
    });

    it("should show an error message if the guild does not exist", async () => {
        const rawError = {
            code: 10004,
            message: "Unknown Guild"
        };

        const error = new DiscordAPIError(rawError, 10004, 404, "GET", "", {});
        vi.spyOn(module.client.api.guilds, "get").mockRejectedValue(error);

        await blacklistGuild(module, interaction);

        expect(response.editParent).toHaveBeenCalledOnce();
        expect(response.editParent).toHaveBeenCalledWith({
            components: [],
            content: expect.stringContaining("The guild you provided does not exist.")
        });
    });

    it("should show a timeout message if the user did not respond in time", async () => {
        vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(undefined);

        await blacklistGuild(module, interaction);

        expect(interaction.editParent).toHaveBeenCalledOnce();
        expect(interaction.editParent).toHaveBeenCalledWith(timeoutContent);
    });
});

describe("blacklistUser", () => {
    let interaction: UpdatableInteraction;
    let module: DevelopersModule;
    let response: MessageComponentInteraction;

    beforeEach(() => {
        vi.useFakeTimers().setSystemTime("01-01-2023");

        const client = createMockApplication();
        module = new DevelopersModule(client);

        const data = createMockMessageComponentInteraction();
        interaction = new UpdatableInteraction(data, client, vi.fn());
        interaction.editParent = vi.fn();

        const responseData = createMockMessageComponentInteraction({
            component_type: ComponentType.UserSelect,
            custom_id: "user",
            resolved: {
                users: { [mockUser.id]: mockUser }
            },
            values: [mockUser.id]
        });
        response = new MessageComponentInteraction(responseData, client, vi.fn());
        response.editParent = vi.fn();

        module.blacklistedUsers.blacklist = vi.fn();
        vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
    });

    it("should blacklist the user", async () => {
        vi.spyOn(module.blacklistedUsers, "isBlacklisted").mockResolvedValue(false);

        await blacklistUser(module, interaction);

        expect(module.blacklistedUsers.blacklist).toHaveBeenCalledOnce();
        expect(module.blacklistedUsers.blacklist).toHaveBeenCalledWith(mockUser.id);
    });

    it("should send a success message", async () => {
        vi.spyOn(module.blacklistedUsers, "isBlacklisted").mockResolvedValue(false);

        await blacklistUser(module, interaction);

        expect(response.editParent).toHaveBeenCalledOnce();
        expect(response.editParent).toHaveBeenCalledWith({
            components: [],
            content: expect.stringContaining(`Successfully blacklisted \`${mockUser.username}\`.`)
        });
    });

    it("should show an error message if the user is already blacklisted", async () => {
        vi.spyOn(module.blacklistedUsers, "isBlacklisted").mockResolvedValue(true);

        await blacklistUser(module, interaction);

        expect(response.editParent).toHaveBeenCalledOnce();
        expect(response.editParent).toHaveBeenCalledWith({
            components: [],
            content: expect.stringContaining("The user you provided is already blacklisted.")
        });
    });

    it("should show an error message if the user does not exist", async () => {
        const data = createMockMessageComponentInteraction({
            component_type: ComponentType.UserSelect,
            custom_id: "user",
            resolved: { users: {} },
            values: [mockUser.id]
        });
        const response = new MessageComponentInteraction(data, module.client, vi.fn());
        response.editParent = vi.fn();

        vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);

        await blacklistUser(module, interaction);

        expect(response.editParent).toHaveBeenCalledOnce();
        expect(response.editParent).toHaveBeenCalledWith({
            components: [],
            content: expect.stringContaining("The user you provided does not exist.")
        });
    });

    it("should show a timeout message if the user did not respond in time", async () => {
        vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

        await blacklistUser(module, interaction);

        expect(interaction.editParent).toHaveBeenCalledTimes(2);
        expect(interaction.editParent).toHaveBeenCalledWith(timeoutContent);
    });
});
