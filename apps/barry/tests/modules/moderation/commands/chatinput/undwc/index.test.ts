import { type ModerationSettings, CaseType } from "@prisma/client";

import { ApplicationCommandType, MessageFlags } from "@discordjs/core";
import {
    createMockApplicationCommandInteraction,
    mockChannel,
    mockGuild,
    mockInteractionMember,
    mockRole,
    mockUser
} from "@barry-bot/testing";

import { ApplicationCommandInteraction } from "@barry-bot/core";
import { createMockApplication } from "../../../../../mocks/application.js";
import { mockCase } from "../../../mocks/case.js";

import UnDWCCommand, { type UnDWCOptions } from "../../../../../../src/modules/moderation/commands/chatinput/undwc/index.js";
import ModerationModule from "../../../../../../src/modules/moderation/index.js";
import * as permissions from "../../../../../../src/modules/moderation/functions/permissions.js";

describe("/undwc", () => {
    let command: UnDWCCommand;
    let interaction: ApplicationCommandInteraction;
    let options: UnDWCOptions;
    let settings: ModerationSettings;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new ModerationModule(client);
        command = new UnDWCCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client, vi.fn());

        options = {
            reason: "Oops",
            user: mockUser
        };
        settings = {
            channelID: mockChannel.id,
            dwcDays: 7,
            dwcRoleID: mockRole.id,
            enabled: true,
            guildID: mockGuild.id
        };

        if (interaction.data.isChatInput()) {
            interaction.data.resolved.members.set(options.user.id, {
                ...mockInteractionMember,
                roles: [mockRole.id]
            });
        }

        vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
        vi.spyOn(client.api.guilds, "get").mockResolvedValue(mockGuild);
        vi.spyOn(client.api.guilds, "getMember").mockResolvedValue(mockInteractionMember);
        vi.spyOn(client.api.guilds, "removeRoleFromMember").mockResolvedValue();
        vi.spyOn(module.dwcScheduledBans, "get").mockResolvedValue({
            createdAt: new Date(),
            guildID: mockGuild.id,
            userID: options.user.id
        });
        vi.spyOn(module.settings, "getOrCreate").mockResolvedValue(settings);
        vi.spyOn(module, "unflagUser").mockResolvedValue({ ...mockCase, type: CaseType.UnDWC });
    });

    describe("execute", () => {
        it("should remove the 'Deal With Caution' role from the user", async () => {
            const removeSpy = vi.spyOn(command.client.api.guilds, "removeRoleFromMember");

            await command.execute(interaction, options);

            expect(removeSpy).toHaveBeenCalledOnce();
            expect(removeSpy).toHaveBeenCalledWith(
                interaction.guildID,
                options.user.id,
                settings.dwcRoleID,
                {
                    reason: options.reason
                }
            );
        });

        it("should remove the flag from the user", async () => {
            await command.execute(interaction, options);

            expect(command.module.unflagUser).toHaveBeenCalledOnce();
            expect(command.module.unflagUser).toHaveBeenCalledWith({
                channelID: settings.channelID,
                creator: interaction.user,
                guildID: interaction.guildID,
                reason: options.reason,
                user: options.user
            });
        });

        it("should show a success message", async () => {
            const createSpy = vi.spyOn(interaction, "createMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining(`Case \`34\` | Successfully removed the 'Deal With Caution' flag from \`${options.user.username}\`.`),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should ignore if the interaction was invoked outside a guild", async () => {
            delete interaction.guildID;

            await command.execute(interaction, options);

            expect(interaction.acknowledged).toBe(false);
        });

        it("should ignore if the interaction data is not of type 'CHAT_INPUT'", async () => {
            interaction.data.type = ApplicationCommandType.User;

            await command.execute(interaction, options);

            expect(interaction.acknowledged).toBe(false);
        });

        it("should show an error message if the user is not flagged", async () => {
            vi.spyOn(command.module.dwcScheduledBans, "get").mockResolvedValue(null);
            const createSpy = vi.spyOn(interaction, "createMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("That user is not flagged."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should show an error message if the moderator is not above the member", async () => {
            vi.spyOn(permissions, "isAboveMember").mockReturnValue(false);
            const createSpy = vi.spyOn(interaction, "createMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("You cannot remove the 'Deal With Caution' flag from this user."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should show an error message if the bot is not above the member", async () => {
            vi.spyOn(permissions, "isAboveMember")
                .mockReturnValueOnce(true)
                .mockReturnValue(false);
            const createSpy = vi.spyOn(interaction, "createMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("I cannot remove the 'Deal With Caution' flag from this user."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should not remove the role if the user does not have the role", async () => {
            const removeSpy = vi.spyOn(command.client.api.guilds, "removeRoleFromMember");
            if (interaction.data.isChatInput()) {
                interaction.data.resolved.members.set(options.user.id, mockInteractionMember);
            }

            await command.execute(interaction, options);

            expect(removeSpy).not.toHaveBeenCalled();
        });

        it("should not remove the role if the role is not configured", async () => {
            const removeSpy = vi.spyOn(command.client.api.guilds, "removeRoleFromMember");
            settings.dwcRoleID = null;

            await command.execute(interaction, options);

            expect(removeSpy).not.toHaveBeenCalled();
        });

        it("should not remove the role if the user is not in the guild", async () => {
            const removeSpy = vi.spyOn(command.client.api.guilds, "removeRoleFromMember");
            if (interaction.data.isChatInput()) {
                interaction.data.resolved.members.clear();
            }

            await command.execute(interaction, options);

            expect(removeSpy).not.toHaveBeenCalled();
        });

        it("should log the error if an unknown error occurs while removing the role", async () => {
            const error = new Error("Oh no!");
            vi.spyOn(command.client.api.guilds, "removeRoleFromMember").mockRejectedValue(error);

            await command.execute(interaction, options);

            expect(command.client.logger.error).toHaveBeenCalledOnce();
            expect(command.client.logger.error).toHaveBeenCalledWith(error);
        });
    });
});
