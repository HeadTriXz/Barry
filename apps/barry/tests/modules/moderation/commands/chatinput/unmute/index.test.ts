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

import UnmuteCommand, { type UnmuteOptions } from "../../../../../../src/modules/moderation/commands/chatinput/unmute/index.js";
import ModerationModule from "../../../../../../src/modules/moderation/index.js";

describe("/unmute", () => {
    let command: UnmuteCommand;
    let interaction: ApplicationCommandInteraction;
    let mockCase: Case;
    let options: UnmuteOptions;
    let settings: ModerationSettings;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new ModerationModule(client);
        command = new UnmuteCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client, vi.fn());

        mockCase = {
            createdAt: new Date("1-1-2023"),
            creatorID: mockUser.id,
            guildID: mockGuild.id,
            id: 34,
            type: CaseType.Unmute,
            userID: "257522665437265920"
        };
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
        vi.spyOn(module.cases, "create").mockResolvedValue(mockCase);
        vi.spyOn(module.moderationSettings, "getOrCreate").mockResolvedValue(settings);
    });

    describe("execute", () => {
        it("should unmute the member", async () => {
            const editSpy = vi.spyOn(command.client.api.guilds, "editMember");

            await command.execute(interaction, options);

            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith(mockGuild.id, options.member.user.id, {
                communication_disabled_until: null
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

        it("should create a log message", async () => {
            await command.execute(interaction, options);

            expect(command.module.createLogMessage).toHaveBeenCalledOnce();
            expect(command.module.createLogMessage).toHaveBeenCalledWith({
                case: mockCase,
                creator: interaction.user,
                reason: options.reason,
                user: options.member.user
            }, settings);
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
    });
});