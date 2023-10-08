import {
    UpdatableInteraction,
    ModalSubmitInteraction,
    MessageComponentInteraction
} from "@barry/core";
import {
    createMockMessageComponentInteraction,
    createMockModalSubmitInteraction,
    mockGuild,
    mockUser
} from "@barry/testing";
import { unblacklistGuild, unblacklistUser } from "../../../../../../../src/modules/developers/commands/chatinput/devtools/tools/index.js";

import { ComponentType } from "@discordjs/core";
import { DiscordAPIError } from "@discordjs/rest";
import { createMockApplication } from "../../../../../../mocks/application.js";
import { timeoutContent } from "../../../../../../../src/common.js";

import DevelopersModule from "../../../../../../../src/modules/developers/index.js";

describe("unblacklistGuild", () => {
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

        module.blacklistedGuilds.unblacklist = vi.fn();
        vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(response);
        vi.spyOn(client.api.guilds, "get").mockResolvedValue(mockGuild);
    });

    it("should unblacklist the guild", async () => {
        vi.spyOn(module.blacklistedGuilds, "isBlacklisted").mockResolvedValue(true);

        await unblacklistGuild(module, interaction);

        expect(module.blacklistedGuilds.unblacklist).toHaveBeenCalledOnce();
        expect(module.blacklistedGuilds.unblacklist).toHaveBeenCalledWith(mockGuild.id);
    });

    it("should show a success message", async () => {
        vi.spyOn(module.blacklistedGuilds, "isBlacklisted").mockResolvedValue(true);

        await unblacklistGuild(module, interaction);

        expect(response.editParent).toHaveBeenCalledOnce();
        expect(response.editParent).toHaveBeenCalledWith({
            components: [],
            content: expect.stringContaining(`Successfully unblacklisted \`${mockGuild.name}\`.`)
        });
    });

    it("should show an error message if the guild is not blacklisted", async () => {
        vi.spyOn(module.blacklistedGuilds, "isBlacklisted").mockResolvedValue(false);

        await unblacklistGuild(module, interaction);

        expect(response.editParent).toHaveBeenCalledOnce();
        expect(response.editParent).toHaveBeenCalledWith({
            components: [],
            content: expect.stringContaining("The guild you provided is not blacklisted.")
        });
    });

    it("should show an error message if the guild does not exist", async () => {
        const rawError = {
            code: 10004,
            message: "Unknown Guild"
        };

        const error = new DiscordAPIError(rawError, 10004, 404, "GET", "", {});
        vi.spyOn(module.client.api.guilds, "get").mockRejectedValue(error);
        vi.spyOn(module.blacklistedGuilds, "isBlacklisted").mockResolvedValue(true);

        await unblacklistGuild(module, interaction);

        expect(response.editParent).toHaveBeenCalledOnce();
        expect(response.editParent).toHaveBeenCalledWith({
            components: [],
            content: expect.stringContaining("The guild you provided does not exist.")
        });
    });

    it("should show a timeout message if the user did not respond", async () => {
        vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(undefined);

        await unblacklistGuild(module, interaction);

        expect(interaction.editParent).toHaveBeenCalledOnce();
        expect(interaction.editParent).toHaveBeenCalledWith(timeoutContent);
    });
});

describe("unblacklistUser", () => {
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

        module.blacklistedUsers.unblacklist = vi.fn();
        vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
    });

    it("should unblacklist the user", async () => {
        vi.spyOn(module.blacklistedUsers, "isBlacklisted").mockResolvedValue(true);

        await unblacklistUser(module, interaction);

        expect(module.blacklistedUsers.unblacklist).toHaveBeenCalledOnce();
        expect(module.blacklistedUsers.unblacklist).toHaveBeenCalledWith(mockUser.id);
    });

    it("should send a success message", async () => {
        vi.spyOn(module.blacklistedUsers, "isBlacklisted").mockResolvedValue(true);

        await unblacklistUser(module, interaction);

        expect(response.editParent).toHaveBeenCalledOnce();
        expect(response.editParent).toHaveBeenCalledWith({
            components: [],
            content: expect.stringContaining("Successfully unblacklisted")
        });
    });

    it("should show an error message if the user is not blacklisted", async () => {
        vi.spyOn(module.blacklistedUsers, "isBlacklisted").mockResolvedValue(false);

        await unblacklistUser(module, interaction);

        expect(response.editParent).toHaveBeenCalledOnce();
        expect(response.editParent).toHaveBeenCalledWith({
            components: [],
            content: expect.stringContaining("The user you provided is not blacklisted.")
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
        vi.spyOn(module.blacklistedUsers, "isBlacklisted").mockResolvedValue(true);

        await unblacklistUser(module, interaction);

        expect(response.editParent).toHaveBeenCalledOnce();
        expect(response.editParent).toHaveBeenCalledWith({
            components: [],
            content: expect.stringContaining("The user you provided does not exist.")
        });
    });

    it("should show a timeout message if the user did not respond", async () => {
        vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

        await unblacklistUser(module, interaction);

        expect(interaction.editParent).toHaveBeenCalledTimes(2);
        expect(interaction.editParent).toHaveBeenCalledWith(timeoutContent);
    });
});
