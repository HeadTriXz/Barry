import type {
    ModerationSettings,
    ProfilesSettings,
    RequestsSettings
} from "@prisma/client";

import { mockChannel, mockGuild, mockRole } from "@barry-bot/testing";
import { OverwriteType } from "@discordjs/core";
import { createMockApplication } from "../../../mocks/index.js";
import { getDWCRole } from "../../../../src/modules/moderation/functions/getDWCRole.js";

import ModerationModule from "../../../../src/modules/moderation/index.js";

describe("getDWCRole", () => {
    let module: ModerationModule;

    let profilesSettings: ProfilesSettings;
    let requestsSettings: RequestsSettings;
    let settings: ModerationSettings;

    beforeEach(() => {
        const client = createMockApplication();
        module = new ModerationModule(client);

        profilesSettings = {
            channelID: mockChannel.id,
            enabled: true,
            guildID: mockGuild.id,
            lastMessageID: null
        };
        requestsSettings = {
            channelID: mockChannel.id,
            enabled: true,
            guildID: mockGuild.id,
            lastMessageID: null,
            minCompensation: 50
        };
        settings = {
            channelID: mockChannel.id,
            dwcDays: 7,
            dwcRoleID: mockRole.id,
            enabled: true,
            guildID: mockGuild.id
        };

        client.api.channels.editPermissionOverwrite = vi.fn();
    });

    it("should return the existing DWC role if it exists", async () => {
        vi.spyOn(module.client.api.guilds, "getRoles").mockResolvedValue([mockRole]);

        const role = await getDWCRole(module, settings);

        expect(role).toEqual(mockRole);
    });

    it("should create a new DWC role if it doesn't exist", async () => {
        vi.spyOn(module.client.api.guilds, "getRoles").mockResolvedValue([]);
        const createSpy = vi.spyOn(module.client.api.guilds, "createRole").mockResolvedValue(mockRole);

        const role = await getDWCRole(module, settings);

        expect(role).toEqual(mockRole);
        expect(createSpy).toHaveBeenCalledOnce();
        expect(createSpy).toHaveBeenCalledWith(settings.guildID, {
            color: expect.any(Number),
            hoist: true,
            name: "Deal With Caution"
        });
    });

    it("should update the settings with the new role ID", async () => {
        vi.spyOn(module.client.api.guilds, "createRole").mockResolvedValue(mockRole);
        vi.spyOn(module.client.api.guilds, "getRoles").mockResolvedValue([]);
        const upsertSpy = vi.spyOn(module.settings, "upsert");

        await getDWCRole(module, settings);

        expect(upsertSpy).toHaveBeenCalledOnce();
        expect(upsertSpy).toHaveBeenCalledWith(settings.guildID, {
            dwcRoleID: mockRole.id
        });
    });

    it("should update the permissions of the profiles channel", async () => {
        vi.spyOn(module.client.api.guilds, "createRole").mockResolvedValue(mockRole);
        vi.spyOn(module.client.api.guilds, "getRoles").mockResolvedValue([]);
        const updateSpy = vi.spyOn(module.client.api.channels, "editPermissionOverwrite");

        await getDWCRole(module, settings, profilesSettings);

        expect(updateSpy).toHaveBeenCalledOnce();
        expect(updateSpy).toHaveBeenCalledWith(profilesSettings.channelID, mockRole.id, {
            deny: "1024",
            type: OverwriteType.Role
        });
    });

    it("should not update the permissions of the profiles channel if the profiles module is not found", async () => {
        vi.spyOn(module.client.api.guilds, "createRole").mockResolvedValue(mockRole);
        vi.spyOn(module.client.api.guilds, "getRoles").mockResolvedValue([]);
        const updateSpy = vi.spyOn(module.client.api.channels, "editPermissionOverwrite");

        await getDWCRole(module, settings);

        expect(updateSpy).not.toHaveBeenCalled();
    });

    it("should not update the permissions of the profiles channel if the channel is not configured", async () => {
        vi.spyOn(module.client.api.guilds, "createRole").mockResolvedValue(mockRole);
        vi.spyOn(module.client.api.guilds, "getRoles").mockResolvedValue([]);
        const updateSpy = vi.spyOn(module.client.api.channels, "editPermissionOverwrite");
        profilesSettings.channelID = null;

        await getDWCRole(module, settings, profilesSettings);

        expect(updateSpy).not.toHaveBeenCalled();
    });

    it("should update the permissions of the requests channel", async () => {
        vi.spyOn(module.client.api.guilds, "createRole").mockResolvedValue(mockRole);
        vi.spyOn(module.client.api.guilds, "getRoles").mockResolvedValue([]);
        const updateSpy = vi.spyOn(module.client.api.channels, "editPermissionOverwrite");

        await getDWCRole(module, settings, undefined, requestsSettings);

        expect(updateSpy).toHaveBeenCalledOnce();
        expect(updateSpy).toHaveBeenCalledWith(requestsSettings.channelID, mockRole.id, {
            deny: "1024",
            type: OverwriteType.Role
        });
    });

    it("should not update the permissions of the requests channel if the requests module is not found", async () => {
        vi.spyOn(module.client.api.guilds, "createRole").mockResolvedValue(mockRole);
        vi.spyOn(module.client.api.guilds, "getRoles").mockResolvedValue([]);
        const updateSpy = vi.spyOn(module.client.api.channels, "editPermissionOverwrite");

        await getDWCRole(module, settings);

        expect(updateSpy).not.toHaveBeenCalled();
    });

    it("should not update the permissions of the requests channel if the channel is not configured", async () => {
        vi.spyOn(module.client.api.guilds, "createRole").mockResolvedValue(mockRole);
        vi.spyOn(module.client.api.guilds, "getRoles").mockResolvedValue([]);
        const updateSpy = vi.spyOn(module.client.api.channels, "editPermissionOverwrite");
        requestsSettings.channelID = null;

        await getDWCRole(module, settings, undefined, requestsSettings);

        expect(updateSpy).not.toHaveBeenCalled();
    });

    it("should log an error if the bot couldn't create the DWC role", async () => {
        const error = new Error("Oh no!");
        vi.spyOn(module.client.api.guilds, "createRole").mockRejectedValue(error);
        vi.spyOn(module.client.api.guilds, "getRoles").mockResolvedValue([]);

        await getDWCRole(module, settings, profilesSettings, requestsSettings);

        expect(module.client.logger.error).toHaveBeenCalledOnce();
        expect(module.client.logger.error).toHaveBeenCalledWith(error);
    });
});
