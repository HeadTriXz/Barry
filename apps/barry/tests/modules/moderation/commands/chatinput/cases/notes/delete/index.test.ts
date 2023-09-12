import type { CaseWithNotes } from "../../../../../../../../src/modules/moderation/database.js";

import { MessageFlags, PermissionFlagsBits } from "@discordjs/core";
import {
    createMockApplicationCommandInteraction,
    mockMember,
    mockUser
} from "@barry/testing";
import { mockCase, mockCaseNote } from "../../../../../mocks/case.js";
import { ApplicationCommandInteraction } from "@barry/core";
import { createMockApplication } from "../../../../../../../mocks/application.js";

import DeleteNoteCommand, { type DeleteNoteOptions } from "../../../../../../../../src/modules/moderation/commands/chatinput/cases/notes/delete/index.js";
import ModerationModule from "../../../../../../../../src/modules/moderation/index.js";

describe("/cases notes delete", () => {
    let command: DeleteNoteCommand;
    let interaction: ApplicationCommandInteraction;
    let options: DeleteNoteOptions;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new ModerationModule(client);
        command = new DeleteNoteCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client, vi.fn());

        options = {
            case: 34,
            note: 1
        };

        vi.spyOn(module.cases, "get").mockResolvedValue({
            ...mockCase,
            notes: [mockCaseNote]
        } as CaseWithNotes);
        vi.spyOn(module.caseNotes, "delete").mockResolvedValue(mockCaseNote);
    });

    describe("execute", () => {
        it("should ignore if the interaction was invoked outside a guild", async () => {
            delete interaction.guildID;

            await command.execute(interaction, options);

            expect(interaction.acknowledged).toBe(false);
        });

        it("should show an error message if the provided case does not exist", async () => {
            vi.spyOn(command.module.cases, "get").mockResolvedValue(null);
            const createSpy = vi.spyOn(interaction, "createMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("That case does not exist."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should show an error message if the provided note does not exist", async () => {
            vi.spyOn(command.module.cases, "get").mockResolvedValue({ ...mockCase, notes: [] } as CaseWithNotes);
            const createSpy = vi.spyOn(interaction, "createMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("That note does not exist."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should show an error message if the user tries deleting a note that is not theirs", async () => {
            interaction.user = { ...mockUser, id: mockCase.userID };
            const createSpy = vi.spyOn(interaction, "createMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("That is not your note."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should delete the provided note", async () => {
            const deleteSpy = vi.spyOn(command.module.caseNotes, "delete");

            await command.execute(interaction, options);

            expect(deleteSpy).toHaveBeenCalledOnce();
            expect(deleteSpy).toHaveBeenCalledWith(interaction.guildID, options.case, options.note);
        });

        it("should bypass if the user has administrator permissions", async () => {
            interaction.user = { ...mockUser, id: mockCase.userID };
            interaction.member = {
                ...mockMember,
                permissions: PermissionFlagsBits.ManageGuild.toString()
            };
            const createSpy = vi.spyOn(interaction, "createMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("Successfully deleted note `1` from case `34`."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should show a success message if the note is successfully deleted", async () => {
            const createSpy = vi.spyOn(interaction, "createMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("Successfully deleted note `1` from case `34`."),
                flags: MessageFlags.Ephemeral
            });
        });
    });
});
