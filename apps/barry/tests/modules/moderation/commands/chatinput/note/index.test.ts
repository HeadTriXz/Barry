import {
    type Case,
    type ModerationSettings,
    CaseType
} from "@prisma/client";
import {
    createMockApplicationCommandInteraction,
    mockGuild,
    mockUser
} from "@barry/testing";
import { ApplicationCommandInteraction } from "@barry/core";
import { MessageFlags } from "@discordjs/core";
import { createMockApplication } from "../../../../../mocks/application.js";

import NoteCommand, { type NoteOptions } from "../../../../../../src/modules/moderation/commands/chatinput/note/index.js";
import ModerationModule from "../../../../../../src/modules/moderation/index.js";

describe("/note", () => {
    let command: NoteCommand;
    let interaction: ApplicationCommandInteraction;
    let mockCase: Case;
    let options: NoteOptions;
    let settings: ModerationSettings;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new ModerationModule(client);
        command = new NoteCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client, vi.fn());

        mockCase = {
            createdAt: new Date("1-1-2023"),
            creatorID: mockUser.id,
            guildID: mockGuild.id,
            id: 34,
            type: CaseType.Note,
            userID: "257522665437265920"
        };
        options = {
            note: "This is a note.",
            user: {
                ...mockUser,
                id: "257522665437265920"
            }
        };
        settings = {
            channelID: "30527482987641765",
            dwcDays: 7,
            dwcRoleID: null,
            enabled: true,
            guildID: "68239102456844360"
        };

        module.createLogMessage = vi.fn();
        vi.spyOn(module.cases, "create").mockResolvedValue(mockCase);
        vi.spyOn(module.moderationSettings, "getOrCreate").mockResolvedValue(settings);
    });

    describe("execute", () => {
        it("should create a note case", async () => {
            await command.execute(interaction, options);

            expect(command.module.cases.create).toHaveBeenCalledOnce();
            expect(command.module.cases.create).toHaveBeenCalledWith({
                creatorID: interaction.user.id,
                guildID: interaction.guildID,
                note: options.note,
                type: CaseType.Note,
                userID: options.user.id
            });
        });

        it("should create a log message", async () => {
            await command.execute(interaction, options);

            expect(command.module.createLogMessage).toHaveBeenCalledOnce();
            expect(command.module.createLogMessage).toHaveBeenCalledWith({
                case: mockCase,
                creator: interaction.user,
                reason: options.note,
                user: options.user
            }, settings);
        });

        it("should send a success message", async () => {
            const createSpy = vi.spyOn(interaction, "createMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining(`Case \`34\` | Successfully added a note to \`${mockUser.username}\`.`),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should ignore if the interaction was sent outside a guild", async () => {
            const createSpy = vi.spyOn(interaction, "createMessage");
            delete interaction.guildID;

            await command.execute(interaction, options);

            expect(createSpy).not.toHaveBeenCalled();
        });
    });
});
