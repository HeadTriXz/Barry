import {
    type Case,
    type ModerationSettings,
    type TempBan,
    CaseType
} from "@prisma/client";
import type { BanOptions } from "../../../../../src/types/moderation.js";

import {
    createMockApplicationCommandInteraction,
    mockChannel,
    mockGuild,
    mockInteractionMember,
    mockMember,
    mockMessage,
    mockUser
} from "@barry-bot/testing";

import { ApplicationCommandInteraction } from "@barry-bot/core";
import { ban } from "../../../../../src/modules/moderation/functions/actions/ban.js";
import { createMockApplication } from "../../../../mocks/application.js";
import { mockCase } from "../../mocks/case.js";

import ModerationModule from "../../../../../src/modules/moderation/index.js";
import * as actions from "../../../../../src/modules/moderation/functions/actions/actions.js";
import * as permissions from "../../../../../src/modules/moderation/functions/permissions.js";

describe("ban", () => {
    let interaction: ApplicationCommandInteraction;
    let entity: Case;
    let module: ModerationModule;
    let options: BanOptions;
    let settings: ModerationSettings;

    beforeEach(() => {
        const client = createMockApplication();
        module = new ModerationModule(client);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client, vi.fn());

        entity = { ...mockCase, type: CaseType.Ban };
        options = {
            member: mockInteractionMember,
            user: {
                ...mockUser,
                id: "257522665437265920"
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
        vi.spyOn(actions, "respond").mockResolvedValue(undefined);
        vi.spyOn(client.api.channels, "createMessage").mockResolvedValue(mockMessage);
        vi.spyOn(client.api.guilds, "get").mockResolvedValue(mockGuild);
        vi.spyOn(client.api.guilds, "getMember").mockResolvedValue(mockMember);
        vi.spyOn(client.api.guilds, "banUser").mockResolvedValue(undefined);
        vi.spyOn(client.api.users, "createDM").mockResolvedValue({ ...mockChannel, position: 0 });
        vi.spyOn(module.cases, "create").mockResolvedValue(entity);
        vi.spyOn(module.settings, "getOrCreate").mockResolvedValue(settings);
    });

    describe("execute", () => {
        describe("Validation", () => {
            it("should ignore if the interaction was sent outside a guild", async () => {
                delete interaction.guildID;

                await ban(module, interaction, options);

                expect(interaction.acknowledged).toBe(false);
            });

            it("should show an error message if the moderator tries to warn themselves", async () => {
                options.user.id = interaction.user.id;

                await ban(module, interaction, options);

                expect(actions.respond).toHaveBeenCalledOnce();
                expect(actions.respond).toHaveBeenCalledWith(
                    interaction,
                    expect.stringContaining("You cannot ban yourself.")
                );
            });

            it("should show an error message if the moderator tries to warn the bot", async () => {
                options.user.id = module.client.applicationID;

                await ban(module, interaction, options);

                expect(actions.respond).toHaveBeenCalledOnce();
                expect(actions.respond).toHaveBeenCalledWith(
                    interaction,
                    expect.stringContaining("Your attempt to ban me has been classified as a failed comedy show audition.")
                );
            });

            it("should show an error message if the moderator is below the target", async () => {
                vi.spyOn(permissions, "isAboveMember").mockReturnValue(false);

                await ban(module, interaction, options);

                expect(actions.respond).toHaveBeenCalledOnce();
                expect(actions.respond).toHaveBeenCalledWith(
                    interaction,
                    expect.stringContaining("You cannot ban this member.")
                );
            });

            it("should show an error message if the bot is below the target", async () => {
                vi.spyOn(permissions, "isAboveMember")
                    .mockReturnValueOnce(true)
                    .mockReturnValue(false);

                await ban(module, interaction, options);

                expect(actions.respond).toHaveBeenCalledOnce();
                expect(actions.respond).toHaveBeenCalledWith(
                    interaction,
                    expect.stringContaining("I cannot ban this member.")
                );
            });

            it("should show an error message if the duration is less than 60 seconds", async () => {
                options.duration = "30s";

                await ban(module, interaction, options);

                expect(actions.respond).toHaveBeenCalledOnce();
                expect(actions.respond).toHaveBeenCalledWith(
                    interaction,
                    expect.stringContaining("The duration must at least be 60 seconds.")
                );
            });

            it("should show an error message if the duration is more than 28 days", async () => {
                options.duration = "30d";

                await ban(module, interaction, options);

                expect(actions.respond).toHaveBeenCalledOnce();
                expect(actions.respond).toHaveBeenCalledWith(
                    interaction,
                    expect.stringContaining("The duration must not exceed 28 days.")
                );
            });
        });

        describe("Error Handling", () => {
            it("should log an error if the ban fails due to an unknown error", async () => {
                const error = new Error("Oh no!");
                vi.spyOn(module.client.api.guilds, "banUser").mockRejectedValueOnce(error);
                vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);

                await ban(module, interaction, options);

                expect(module.client.logger.error).toHaveBeenCalledOnce();
                expect(module.client.logger.error).toHaveBeenCalledWith(error);
            });
        });

        describe("Temporarily Ban", () => {
            let tempBan: TempBan;

            beforeEach(() => {
                tempBan = {
                    expiresAt: new Date("1-1-2023"),
                    guildID: mockGuild.id,
                    userID: options.user.id
                };

                vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
                vi.spyOn(module.tempBans, "get").mockResolvedValueOnce(tempBan);
            });

            it("should delete an existing scheduled unban if the ban is permanent", async () => {
                const deleteSpy = vi.spyOn(module.tempBans, "delete");

                await ban(module, interaction, options);

                expect(deleteSpy).toHaveBeenCalledOnce();
                expect(deleteSpy).toHaveBeenCalledWith(mockGuild.id, options.user.id);
            });

            it("should create a new scheduled unban if the ban is temporary", async () => {
                vi.spyOn(module.tempBans, "get").mockResolvedValueOnce(null);
                const createSpy = vi.spyOn(module.tempBans, "create");
                options.duration = "1d";

                await ban(module, interaction, options);

                expect(createSpy).toHaveBeenCalledOnce();
                expect(createSpy).toHaveBeenCalledWith(mockGuild.id, options.user.id, 86400);
            });

            it("should update an existing scheduled unban if the ban is temporary", async () => {
                const updateSpy = vi.spyOn(module.tempBans, "update");
                options.duration = "1d";

                await ban(module, interaction, options);

                expect(updateSpy).toHaveBeenCalledOnce();
                expect(updateSpy).toHaveBeenCalledWith(mockGuild.id, options.user.id, 86400);
            });

            it("should show an error if the ban is permanently and the user is already banned indefinitely", async () => {
                delete options.member;
                vi.spyOn(module.tempBans, "get").mockResolvedValueOnce(null);
                vi.spyOn(module, "isBanned").mockResolvedValueOnce(true);

                await ban(module, interaction, options);

                expect(actions.respond).toHaveBeenCalledOnce();
                expect(actions.respond).toHaveBeenCalledWith(
                    interaction,
                    expect.stringContaining("This user is already banned.")
                );
            });
        });

        describe("Notify User", () => {
            it("should send a direct message to the target if they are still in the guild", async () => {
                vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);

                await ban(module, interaction, options);

                expect(module.notifyUser).toHaveBeenCalledOnce();
                expect(module.notifyUser).toHaveBeenCalledWith({
                    guild: mockGuild,
                    reason: options.reason,
                    type: CaseType.Ban,
                    userID: options.user.id
                });
            });

            it("should not send a direct message to the target if they are not in the guild", async () => {
                delete options.member;
                vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);

                await ban(module, interaction, options);

                expect(module.notifyUser).not.toHaveBeenCalled();
            });
        });

        describe("Ban User", () => {
            it("should ban the user from the guild if they aren't yet", async () => {
                vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
                const banSpy = vi.spyOn(module.client.api.guilds, "banUser");

                await ban(module, interaction, options);

                expect(banSpy).toHaveBeenCalledOnce();
                expect(banSpy).toHaveBeenCalledWith(mockGuild.id, options.user.id, {
                    delete_message_seconds: 0
                }, {
                    reason: options.reason
                });
            });

            it("should delete the messages of the user if the 'delete' option is enabled", async () => {
                vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
                const banSpy = vi.spyOn(module.client.api.guilds, "banUser");

                options.delete = true;
                await ban(module, interaction, options);

                expect(banSpy).toHaveBeenCalledOnce();
                expect(banSpy).toHaveBeenCalledWith(mockGuild.id, options.user.id, {
                    delete_message_seconds: 604800
                }, {
                    reason: options.reason
                });
            });

            it("should not ban the user if they are already banned", async () => {
                delete options.member;
                vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
                vi.spyOn(module, "isBanned").mockResolvedValueOnce(true);
                const banSpy = vi.spyOn(module.client.api.guilds, "banUser");

                await ban(module, interaction, options);

                expect(banSpy).not.toHaveBeenCalled();
            });
        });

        it("should create a new case in the database", async () => {
            vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
            const createSpy = vi.spyOn(module.cases, "create");

            await ban(module, interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                creatorID: interaction.user.id,
                guildID: interaction.guildID,
                note: options.reason,
                type: CaseType.Ban,
                userID: options.user.id
            });
        });

        it("should show a success message to the moderator", async () => {
            vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);

            await ban(module, interaction, options);

            expect(actions.respond).toHaveBeenCalledOnce();
            expect(actions.respond).toHaveBeenCalledWith(
                interaction,
                expect.stringContaining(`Case \`34\` | Successfully banned \`${options.user.username}\``)
            );
        });

        it("should log the case in the configured log channel", async () => {
            vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
            const createSpy = vi.spyOn(module, "createLogMessage");

            await ban(module, interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith(settings.channelID, {
                case: entity,
                creator: interaction.user,
                reason: options.reason,
                user: options.user
            });
        });

        it("should not log the case if there is no log channel configured", async () => {
            vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
            const createSpy = vi.spyOn(module, "createLogMessage");
            settings.channelID = null;

            await ban(module, interaction, options);

            expect(createSpy).not.toHaveBeenCalled();
        });
    });
});
