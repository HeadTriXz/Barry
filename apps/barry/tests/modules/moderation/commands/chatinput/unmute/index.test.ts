import {
    type Case,
    type ModerationSettings,
    CaseType
} from "@prisma/client";
import {
    createMockApplicationCommandInteraction,
    mockGuild,
    mockMember,
    mockUser
} from "@barry/testing";

import { ApplicationCommandInteraction } from "@barry/core";
import { MessageFlags } from "@discordjs/core";
import { createMockApplication } from "../../../../../mocks/index.js";
import { mockCase } from "../../../mocks/case.js";

import UnmuteCommand, { type UnmuteOptions } from "../../../../../../src/modules/moderation/commands/chatinput/unmute/index.js";
import ModerationModule from "../../../../../../src/modules/moderation/index.js";

describe("/unmute", () => {
    let command: UnmuteCommand;
    let interaction: ApplicationCommandInteraction;
    let entity: Case;
    let options: UnmuteOptions;
    let settings: ModerationSettings;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new ModerationModule(client);
        command = new UnmuteCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client, vi.fn());

        entity = { ...mockCase, type: CaseType.Unmute };
        options = {
            member: {
                ...mockMember,
                communication_disabled_until: new Date("1-1-2023").toISOString(),
                user: {
                    ...mockUser,
                    id: "257522665437265920"
                }
            },
            reason: "Rude!"
        };
        settings = {
            channelID: "30527482987641765",
            dwcDays: 7,
            dwcRoleID: null,
            enabled: true,
            guildID: "68239102456844360"
        };

        module.createLogMessage = vi.fn();
        module.notifyUser = vi.fn();
        vi.spyOn(client.api.guilds, "editMember").mockResolvedValue(mockMember);
        vi.spyOn(client.api.guilds, "get").mockResolvedValue(mockGuild);
        vi.spyOn(module.cases, "create").mockResolvedValue(entity);
        vi.spyOn(module.settings, "getOrCreate").mockResolvedValue(settings);
    });

    describe("execute", () => {
        it("should unmute the member", async () => {
            const editSpy = vi.spyOn(command.client.api.guilds, "editMember");

            await command.execute(interaction, options);

            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith(mockGuild.id, options.member.user.id, {
                communication_disabled_until: null
            }, {
                reason: options.reason
            });
        });

        it("should send a success message", async () => {
            const createSpy = vi.spyOn(interaction, "createMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining(`Case \`34\` | Successfully unmuted \`${options.member.user.username}\`.`),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should notify the user", async () => {
            await command.execute(interaction, options);

            expect(command.module.notifyUser).toHaveBeenCalledOnce();
            expect(command.module.notifyUser).toHaveBeenCalledWith({
                guild: mockGuild,
                reason: options.reason,
                type: CaseType.Unmute,
                userID: options.member.user.id
            });
        });

        it("should log the case in the configured log channel", async () => {
            await command.execute(interaction, options);

            expect(command.module.createLogMessage).toHaveBeenCalledOnce();
            expect(command.module.createLogMessage).toHaveBeenCalledWith(settings.channelID, {
                case: entity,
                creator: interaction.user,
                reason: options.reason,
                user: options.member.user
            });
        });

        it("should not log the case if there is no log channel configured", async () => {
            settings.channelID = null;

            await command.execute(interaction, options);

            expect(command.module.createLogMessage).not.toHaveBeenCalled();
        });

        it("should ignore if the interaction was sent outside a guild", async () => {
            delete interaction.guildID;

            await command.execute(interaction, options);

            expect(interaction.acknowledged).toBe(false);
        });

        it("should show an error message if the user is not muted", async () => {
            const createSpy = vi.spyOn(interaction, "createMessage");
            options.member.communication_disabled_until = null;

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("That member is not muted"),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should show an error message if the unmute failed", async () => {
            const error = new Error("Oh no!");
            const createSpy = vi.spyOn(interaction, "createMessage");
            vi.spyOn(command.client.api.guilds, "editMember").mockRejectedValue(error);

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("Failed to unmute this member"),
                flags: MessageFlags.Ephemeral
            });
            expect(command.client.logger.error).toHaveBeenCalledOnce();
            expect(command.client.logger.error).toHaveBeenCalledWith(error);
        });
    });
});
