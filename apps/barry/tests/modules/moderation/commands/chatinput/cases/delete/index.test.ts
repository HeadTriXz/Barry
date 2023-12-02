import type { CaseWithNotes } from "../../../../../../../src/modules/moderation/database/index.js";

import {
    ApplicationCommandInteraction,
    MessageComponentInteraction
} from "@barry-bot/core";
import {
    ButtonStyle,
    ComponentType,
    MessageFlags
} from "@discordjs/core";
import {
    createMockApplicationCommandInteraction,
    createMockMessageComponentInteraction,
    mockUser
} from "@barry-bot/testing";

import { mockCase, mockCaseNote } from "../../../../mocks/case.js";
import { createMockApplication } from "../../../../../../mocks/application.js";

import DeleteCommand, { type DeleteCasesOptions } from "../../../../../../../src/modules/moderation/commands/chatinput/cases/delete/index.js";
import ModerationModule from "../../../../../../../src/modules/moderation/index.js";

describe("/cases delete", () => {
    let command: DeleteCommand;
    let interaction: ApplicationCommandInteraction;
    let entity: CaseWithNotes;
    let options: DeleteCasesOptions;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new ModerationModule(client);
        command = new DeleteCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client, vi.fn());
        interaction.editOriginalMessage = vi.fn();

        entity = { ...mockCase, notes: [mockCaseNote] };
        options = {
            case: 34
        };

        vi.spyOn(module.cases, "get").mockResolvedValue(entity);

        vi.spyOn(client.api.users, "get")
            .mockResolvedValueOnce(mockUser)
            .mockResolvedValue({ ...mockUser, id: "257522665437265920" });
    });

    describe("execute", () => {
        it("should ignore if the interaction is not invoked in a guild", async () => {
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

        it("should prompt the user to confirm the deletion", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);
            const createSpy = vi.spyOn(interaction, "createMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: [{
                        components: [
                            {
                                custom_id: "confirm",
                                label: "Confirm",
                                style: ButtonStyle.Danger,
                                type: ComponentType.Button
                            },
                            {
                                custom_id: "cancel",
                                label: "Cancel",
                                style: ButtonStyle.Secondary,
                                type: ComponentType.Button
                            }
                        ],
                        type: ComponentType.ActionRow
                    }],
                    content: expect.stringContaining("Are you sure you want to delete this case?"),
                    flags: MessageFlags.Ephemeral
                })
            );
        });

        it("should delete the case if the user confirms", async () => {
            const data = createMockMessageComponentInteraction({
                custom_id: "confirm",
                component_type: ComponentType.Button
            });
            const response = new MessageComponentInteraction(data, command.client, vi.fn());

            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
            const deleteSpy = vi.spyOn(command.module.cases, "delete").mockResolvedValue(entity);
            const editSpy = vi.spyOn(response, "editParent");

            await command.execute(interaction, options);

            expect(deleteSpy).toHaveBeenCalledOnce();
            expect(deleteSpy).toHaveBeenCalledWith(interaction.guildID, options.case);
            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith({
                components: [],
                content: expect.stringContaining("Successfully deleted case `34`."),
                embeds: [],
                flags: MessageFlags.Ephemeral
            });
        });

        it("should do nothing if the user cancels", async () => {
            const data = createMockMessageComponentInteraction({
                custom_id: "cancel",
                component_type: ComponentType.Button
            });
            const response = new MessageComponentInteraction(data, command.client, vi.fn());

            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
            const deleteSpy = vi.spyOn(command.module.cases, "delete").mockResolvedValue(entity);
            const editSpy = vi.spyOn(response, "editParent");

            await command.execute(interaction, options);

            expect(deleteSpy).not.toHaveBeenCalled();
            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith({
                components: [],
                content: expect.stringContaining("Cancelled the deletion of case `34`."),
                embeds: [],
                flags: MessageFlags.Ephemeral
            });
        });

        it("should show a timeout message if the user does not respond", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);
            const deleteSpy = vi.spyOn(command.module.cases, "delete").mockResolvedValue(entity);
            const editSpy = vi.spyOn(interaction, "editOriginalMessage");

            await command.execute(interaction, options);

            expect(deleteSpy).not.toHaveBeenCalled();
            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith({
                components: [],
                content: expect.stringContaining("It took you too long to respond. Please try again."),
                embeds: [],
                flags: MessageFlags.Ephemeral
            });
        });
    });
});
