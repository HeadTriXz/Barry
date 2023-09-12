import type { CaseWithNotes } from "../../../../../../../dist/modules/moderation/database.js";
import {
    createMockApplicationCommandInteraction,
    mockGuild,
    mockUser
} from "@barry/testing";
import { mockCase, mockCaseNote } from "../../../../mocks/case.js";

import { ApplicationCommandInteraction } from "@barry/core";
import { CaseType } from "@prisma/client";
import { MessageFlags } from "@discordjs/core";
import { createMockApplication } from "../../../../../../mocks/application.js";

import ViewCommand, { type ViewCasesOptions } from "../../../../../../../src/modules/moderation/commands/chatinput/cases/view/index.js";
import ModerationModule from "../../../../../../../src/modules/moderation/index.js";

describe("/cases view", () => {
    let command: ViewCommand;
    let interaction: ApplicationCommandInteraction;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new ModerationModule(client);
        command = new ViewCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client, vi.fn());
        interaction.editOriginalMessage = vi.fn();
    });

    describe("execute", () => {
        it("should ignore if the interaction is not invoked in a guild", async () => {
            delete interaction.guildID;

            await command.execute(interaction, {});

            expect(interaction.acknowledged).toBe(false);
        });
    });

    describe("#showCase", () => {
        const userID = "257522665437265920";
        let options: ViewCasesOptions;

        beforeEach(() => {
            options = {
                case: 34
            };

            vi.spyOn(command.module.cases, "get").mockResolvedValue({
                ...mockCase, notes: [mockCaseNote]
            } as CaseWithNotes);
            vi.spyOn(command.client.api.users, "get")
                .mockResolvedValueOnce(mockUser)
                .mockResolvedValue({ ...mockUser, id: userID });
        });

        it("should show the specified case", async () => {
            const editSpy = vi.spyOn(interaction, "editOriginalMessage");

            await command.execute(interaction, options);

            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith({
                content: "",
                embeds: [{
                    author: {
                        icon_url: expect.any(String),
                        name: mockUser.username
                    },
                    color: expect.any(Number),
                    description: `**Target:** <@${userID}> \`${mockUser.username}\`\n` +
                        `**Creator:** <@${mockUser.id}> \`${mockUser.username}\`\n` +
                        `**Date:** <t:${Math.trunc(new Date("01-01-2023").getTime() / 1000)}:R>`,
                    fields: [{
                        name: "**Notes**",
                        value: `\`1\` <@${mockUser.id}> — <t:${Math.trunc(new Date("01-01-2023").getTime() / 1000)}:R>\nRude!`
                    }],
                    footer: {
                        text: `User ID: ${userID}`
                    },
                    thumbnail: {
                        url: expect.any(String)
                    },
                    timestamp: new Date("01-01-2023").toISOString(),
                    title: expect.stringContaining("Note | Inspecting case #34")
                }]
            });
        });

        it("should show an error message if the case does not exist", async () => {
            vi.spyOn(command.module.cases, "get").mockResolvedValueOnce(null);

            const createSpy = vi.spyOn(interaction, "createMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("That case does not exist."),
                flags: MessageFlags.Ephemeral
            });
        });
    });

    describe("#showGuild", () => {
        beforeEach(() => {
            vi.spyOn(command.client.api.guilds, "get").mockResolvedValue(mockGuild);
            vi.spyOn(command.module.cases, "getAll").mockResolvedValue([
                { ...mockCase, id: 35 },
                { ...mockCase, id: 33 }
            ]);
        });

        it("should show the guild's cases", async () => {
            const editSpy = vi.spyOn(interaction, "editOriginalMessage");

            await command.execute(interaction, {});

            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith({
                content: "",
                embeds: [{
                    author: {
                        icon_url: expect.any(String),
                        name: mockGuild.name
                    },
                    color: expect.any(Number),
                    description: expect.stringContaining(`Found \`2\` cases for \`${mockGuild.name}\`\n\n`),
                    footer: {
                        text: "Page 1 of 1"
                    },
                    thumbnail: {
                        url: expect.any(String)
                    }
                }]
            });
        });

        it("should hide the thumbnail if the guild has no icon", async () => {
            vi.spyOn(command.client.api.guilds, "get").mockResolvedValue({ ...mockGuild, icon: null });

            const editSpy = vi.spyOn(interaction, "editOriginalMessage");

            await command.execute(interaction, {});

            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith({
                content: "",
                embeds: [{
                    author: {
                        name: mockGuild.name
                    },
                    color: expect.any(Number),
                    description: expect.stringContaining(`Found \`2\` cases for \`${mockGuild.name}\`\n\n`),
                    footer: {
                        text: "Page 1 of 1"
                    }
                }]
            });
        });

        it("should fetch all cases with the specified type", async () => {
            const getSpy = vi.spyOn(command.module.cases, "getAll");

            await command.execute(interaction, { type: CaseType.Note });

            expect(getSpy).toHaveBeenCalledOnce();
            expect(getSpy).toHaveBeenCalledWith(mockGuild.id, CaseType.Note);
        });
    });

    describe("#showUser", () => {
        let options: ViewCasesOptions;

        beforeEach(() => {
            options = {
                user: mockUser
            };

            vi.spyOn(command.client.api.guilds, "get").mockResolvedValue(mockGuild);
            vi.spyOn(command.module.cases, "getByUser").mockResolvedValue([
                { ...mockCase, id: 35 },
                { ...mockCase, id: 33 }
            ]);
        });

        it("should show the user's cases", async () => {
            const editSpy = vi.spyOn(interaction, "editOriginalMessage");

            await command.execute(interaction, options);

            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith({
                content: "",
                embeds: [{
                    author: {
                        icon_url: expect.any(String),
                        name: mockUser.username
                    },
                    color: expect.any(Number),
                    description: expect.stringContaining(`Found \`2\` cases for \`${mockUser.username}\`\n\n`),
                    footer: {
                        text: "Page 1 of 1"
                    },
                    thumbnail: {
                        url: expect.any(String)
                    }
                }]
            });
        });

        it("should fetch all cases with the specified type", async () => {
            const getSpy = vi.spyOn(command.module.cases, "getByUser");

            await command.execute(interaction, { type: CaseType.Note, user: mockUser });

            expect(getSpy).toHaveBeenCalledOnce();
            expect(getSpy).toHaveBeenCalledWith(mockGuild.id, mockUser.id, CaseType.Note);
        });

        it("should throw an error if the interaction is not in a guild", async () => {
            vi.spyOn(interaction, "isInvokedInGuild")
                .mockResolvedValueOnce(true)
                .mockReturnValue(false);

            await expect(() => command.execute(interaction, options)).rejects.toThrowError(
                "Tried showing cases outside a guild."
            );
        });
    });
});
