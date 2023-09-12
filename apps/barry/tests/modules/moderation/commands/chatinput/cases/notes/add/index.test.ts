import { mockCase, mockCaseNote } from "../../../../../mocks/case.js";
import { ApplicationCommandInteraction } from "@barry/core";
import { MessageFlags } from "@discordjs/core";
import { createMockApplication } from "../../../../../../../mocks/application.js";
import { createMockApplicationCommandInteraction } from "@barry/testing";

import AddNoteCommand, { type AddNoteOptions } from "../../../../../../../../src/modules/moderation/commands/chatinput/cases/notes/add/index.js";
import ModerationModule from "../../../../../../../../src/modules/moderation/index.js";

describe("/cases notes add", () => {
    let command: AddNoteCommand;
    let interaction: ApplicationCommandInteraction;
    let options: AddNoteOptions;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new ModerationModule(client);
        command = new AddNoteCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client, vi.fn());

        options = {
            case: 34,
            content: "Hello World!"
        };

        vi.spyOn(module.cases, "get").mockResolvedValue(mockCase);
        vi.spyOn(module.caseNotes, "create").mockResolvedValue(mockCaseNote);
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

        it("should create a new note on a case", async () => {
            const createSpy = vi.spyOn(command.module.caseNotes, "create");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                caseID: options.case,
                content: options.content,
                creatorID: interaction.user.id,
                guildID: interaction.guildID
            });
        });

        it("should show a success message if the note is successfully added", async () => {
            const createSpy = vi.spyOn(interaction, "createMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("Successfully added note `1` to case `34`."),
                flags: MessageFlags.Ephemeral
            });
        });
    });
});
