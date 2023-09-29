import type { CaseWithNotes } from "../../../../../../../../src/modules/moderation/database/index.js";
import {
    createMockApplicationCommandInteraction,
    mockUser
} from "@barry/testing";
import { mockCase, mockCaseNote } from "../../../../../mocks/case.js";

import { ApplicationCommandInteraction } from "@barry/core";
import { MessageFlags } from "@discordjs/core";
import { createMockApplication } from "../../../../../../../mocks/application.js";

import EditNoteCommand, { type EditNoteOptions } from "../../../../../../../../src/modules/moderation/commands/chatinput/cases/notes/edit/index.js";
import ModerationModule from "../../../../../../../../src/modules/moderation/index.js";

describe("/cases notes edit", () => {
    let command: EditNoteCommand;
    let interaction: ApplicationCommandInteraction;
    let options: EditNoteOptions;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new ModerationModule(client);
        command = new EditNoteCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client, vi.fn());

        options = {
            case: 34,
            content: "Hello World!",
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

        it("should show an error message if the user tries editing a note that is not theirs", async () => {
            interaction.user = { ...mockUser, id: mockCase.userID };
            const createSpy = vi.spyOn(interaction, "createMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("That is not your note."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should edit the provided note", async () => {
            const updateSpy = vi.spyOn(command.module.caseNotes, "update");

            await command.execute(interaction, options);

            expect(updateSpy).toHaveBeenCalledOnce();
            expect(updateSpy).toHaveBeenCalledWith(interaction.guildID, options.case, options.note, {
                content: options.content
            });
        });

        it("should show a success message if the note is successfully edited", async () => {
            const createSpy = vi.spyOn(interaction, "createMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("Successfully edited note `1` of case `34`."),
                flags: MessageFlags.Ephemeral
            });
        });
    });
});
