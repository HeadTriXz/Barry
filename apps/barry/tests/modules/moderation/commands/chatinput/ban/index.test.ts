import {
    type Case,
    type ModerationSettings,
    type TempBan,
    CaseType
} from "@prisma/client";
import { ApplicationCommandInteraction, AutocompleteInteraction } from "@barry/core";
import { ApplicationCommandType, MessageFlags } from "@discordjs/core";
import {
    createMockApplicationCommandInteraction,
    createMockAutocompleteInteraction,
    mockChannel,
    mockGuild,
    mockInteractionMember,
    mockMember,
    mockMessage,
    mockUser
} from "@barry/testing";

import { COMMON_SEVERE_REASONS } from "../../../../../../src/modules/moderation/constants.js";
import { createMockApplication } from "../../../../../mocks/application.js";

import BanCommand, { type BanOptions } from "../../../../../../src/modules/moderation/commands/chatinput/ban/index.js";
import ModerationModule from "../../../../../../src/modules/moderation/index.js";
import * as permissions from "../../../../../../src/modules/moderation/functions/permissions.js";

describe("/ban", () => {
    let command: BanCommand;
    let interaction: ApplicationCommandInteraction;
    let mockCase: Case;
    let options: BanOptions;
    let settings: ModerationSettings;

    beforeEach(() => {
        const client = createMockApplication();

        const module = new ModerationModule(client);
        command = new BanCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client, vi.fn());
        if (interaction.data.isChatInput()) {
            interaction.data.resolved.members.set("257522665437265920", mockInteractionMember);
        }

        mockCase = {
            createdAt: new Date("1-1-2023"),
            creatorID: mockUser.id,
            guildID: mockGuild.id,
            id: 34,
            type: CaseType.Ban,
            userID: "257522665437265920"
        };
        options = {
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
        vi.spyOn(client.api.channels, "createMessage").mockResolvedValue(mockMessage);
        vi.spyOn(client.api.guilds, "get").mockResolvedValue(mockGuild);
        vi.spyOn(client.api.guilds, "getMember").mockResolvedValue(mockMember);
        vi.spyOn(client.api.guilds, "banUser").mockResolvedValue(undefined);
        vi.spyOn(client.api.users, "createDM").mockResolvedValue({ ...mockChannel, position: 0 });
        vi.spyOn(module.cases, "create").mockResolvedValue(mockCase);
        vi.spyOn(module.moderationSettings, "getOrCreate").mockResolvedValue(settings);
    });

    describe("execute", () => {
        describe("Validation", () => {
            it("should ignore if the interaction was sent outside a guild", async () => {
                delete interaction.guildID;

                await command.execute(interaction, options);

                expect(interaction.acknowledged).toBe(false);
            });

            it("should show an error message if the moderator tries to warn themselves", async () => {
                const createSpy = vi.spyOn(interaction, "createMessage");
                options.user.id = interaction.user.id;

                await command.execute(interaction, options);

                expect(createSpy).toHaveBeenCalledOnce();
                expect(createSpy).toHaveBeenCalledWith({
                    content: expect.stringContaining("You cannot ban yourself."),
                    flags: MessageFlags.Ephemeral
                });
            });

            it("should show an error message if the moderator tries to warn the bot", async () => {
                const createSpy = vi.spyOn(interaction, "createMessage");
                options.user.id = command.client.applicationID;

                await command.execute(interaction, options);

                expect(createSpy).toHaveBeenCalledOnce();
                expect(createSpy).toHaveBeenCalledWith({
                    content: expect.stringContaining("Your attempt to ban me has been classified as a failed comedy show audition."),
                    flags: MessageFlags.Ephemeral
                });
            });

            it("should show an error message if the moderator is below the target", async () => {
                vi.spyOn(permissions, "isAboveMember").mockReturnValue(false);
                const createSpy = vi.spyOn(interaction, "createMessage");

                await command.execute(interaction, options);

                expect(createSpy).toHaveBeenCalledOnce();
                expect(createSpy).toHaveBeenCalledWith({
                    content: expect.stringContaining("You cannot ban this member."),
                    flags: MessageFlags.Ephemeral
                });
            });

            it("should show an error message if the bot is below the target", async () => {
                vi.spyOn(permissions, "isAboveMember")
                    .mockReturnValueOnce(true)
                    .mockReturnValue(false);
                const createSpy = vi.spyOn(interaction, "createMessage");

                await command.execute(interaction, options);

                expect(createSpy).toHaveBeenCalledOnce();
                expect(createSpy).toHaveBeenCalledWith({
                    content: expect.stringContaining("I cannot ban this member."),
                    flags: MessageFlags.Ephemeral
                });
            });

            it("should show an error message if the duration is less than 60 seconds", async () => {
                const createSpy = vi.spyOn(interaction, "createMessage");
                options.duration = "30s";

                await command.execute(interaction, options);

                expect(createSpy).toHaveBeenCalledOnce();
                expect(createSpy).toHaveBeenCalledWith({
                    content: expect.stringContaining("The duration must at least be 60 seconds."),
                    flags: MessageFlags.Ephemeral
                });
            });

            it("should show an error message if the duration is more than 28 days", async () => {
                const createSpy = vi.spyOn(interaction, "createMessage");
                options.duration = "30d";

                await command.execute(interaction, options);

                expect(createSpy).toHaveBeenCalledOnce();
                expect(createSpy).toHaveBeenCalledWith({
                    content: expect.stringContaining("The duration must not exceed 28 days."),
                    flags: MessageFlags.Ephemeral
                });
            });
        });

        describe("Error Handling", () => {
            it("should log an error if the ban fails due to an unknown error", async () => {
                const error = new Error("Oh no!");
                vi.spyOn(command.client.api.guilds, "banUser").mockRejectedValueOnce(error);
                vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);

                await command.execute(interaction, options);

                expect(command.client.logger.error).toHaveBeenCalledOnce();
                expect(command.client.logger.error).toHaveBeenCalledWith(error);
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
                vi.spyOn(command.module.tempBans, "get").mockResolvedValueOnce(tempBan);
            });

            it("should delete an existing scheduled unban if the ban is permanent", async () => {
                const deleteSpy = vi.spyOn(command.module.tempBans, "delete");

                await command.execute(interaction, options);

                expect(deleteSpy).toHaveBeenCalledOnce();
                expect(deleteSpy).toHaveBeenCalledWith(mockGuild.id, options.user.id);
            });

            it("should create a new scheduled unban if the ban is temporary", async () => {
                vi.spyOn(command.module.tempBans, "get").mockResolvedValueOnce(null);
                const createSpy = vi.spyOn(command.module.tempBans, "create");
                options.duration = "1d";

                await command.execute(interaction, options);

                expect(createSpy).toHaveBeenCalledOnce();
                expect(createSpy).toHaveBeenCalledWith(mockGuild.id, options.user.id, 86400);
            });

            it("should update an existing scheduled unban if the ban is temporary", async () => {
                const updateSpy = vi.spyOn(command.module.tempBans, "update");
                options.duration = "1d";

                await command.execute(interaction, options);

                expect(updateSpy).toHaveBeenCalledOnce();
                expect(updateSpy).toHaveBeenCalledWith(mockGuild.id, options.user.id, 86400);
            });

            it("should show an error if the ban is permanently and the user is already banned indefinitely", async () => {
                if (interaction.data.isChatInput()) {
                    interaction.data.resolved.members.delete(options.user.id);
                }
                vi.spyOn(command.module.tempBans, "get").mockResolvedValueOnce(null);
                vi.spyOn(command.module, "isBanned").mockResolvedValueOnce(true);
                const createSpy = vi.spyOn(interaction, "createMessage");

                await command.execute(interaction, options);

                expect(createSpy).toHaveBeenCalledOnce();
                expect(createSpy).toHaveBeenCalledWith({
                    content: expect.stringContaining("This user is already banned."),
                    flags: MessageFlags.Ephemeral
                });
            });
        });

        describe("Notify User", () => {
            it("should send a direct message to the target if they are still in the guild", async () => {
                vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);

                await command.execute(interaction, options);

                expect(command.module.notifyUser).toHaveBeenCalledOnce();
                expect(command.module.notifyUser).toHaveBeenCalledWith({
                    guild: mockGuild,
                    reason: options.reason,
                    type: CaseType.Ban,
                    userID: options.user.id
                });
            });

            it("should not send a direct message to the target if they are not in the guild", async () => {
                vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
                if (interaction.data.isChatInput()) {
                    interaction.data.resolved.members.delete(options.user.id);
                }

                await command.execute(interaction, options);

                expect(command.module.notifyUser).not.toHaveBeenCalled();
            });
        });

        describe("Ban User", () => {
            it("should ban the user from the guild if they aren't yet", async () => {
                vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
                const banSpy = vi.spyOn(command.client.api.guilds, "banUser");

                await command.execute(interaction, options);

                expect(banSpy).toHaveBeenCalledOnce();
                expect(banSpy).toHaveBeenCalledWith(mockGuild.id, options.user.id, {
                    delete_message_seconds: 0
                }, {
                    reason: options.reason
                });
            });

            it("should delete the messages of the user if the 'delete' option is enabled", async () => {
                vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
                const banSpy = vi.spyOn(command.client.api.guilds, "banUser");

                options.delete = true;
                await command.execute(interaction, options);

                expect(banSpy).toHaveBeenCalledOnce();
                expect(banSpy).toHaveBeenCalledWith(mockGuild.id, options.user.id, {
                    delete_message_seconds: 604800
                }, {
                    reason: options.reason
                });
            });

            it("should not ban the user if they are already banned", async () => {
                if (interaction.data.isChatInput()) {
                    interaction.data.resolved.members.delete(options.user.id);
                }
                vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
                vi.spyOn(command.module, "isBanned").mockResolvedValueOnce(true);
                const banSpy = vi.spyOn(command.client.api.guilds, "banUser");

                await command.execute(interaction, options);

                expect(banSpy).not.toHaveBeenCalled();
            });
        });

        it("should create a new case in the database", async () => {
            vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
            const createSpy = vi.spyOn(command.module.cases, "create");

            await command.execute(interaction, options);

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
            const createSpy = vi.spyOn(interaction, "createMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining(`Case \`34\` | Successfully banned \`${options.user.username}\``),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should log the case in the configured log channel", async () => {
            vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
            const createSpy = vi.spyOn(command.module, "createLogMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                case: mockCase,
                creator: interaction.user,
                reason: options.reason,
                user: options.user
            }, settings);
        });
    });

    describe("Autocomplete 'reason'", () => {
        it("should show a predefined list of reasons if no value is provided", async () => {
            const data = createMockAutocompleteInteraction({
                id: "49072635294295155",
                name: "ban",
                options: [],
                type: ApplicationCommandType.ChatInput
            });
            const interaction = new AutocompleteInteraction(data, command.client, vi.fn());

            const result = await command.options[1].autocomplete?.("" as never, interaction);

            expect(result).toEqual(COMMON_SEVERE_REASONS.map((x) => ({ name: x, value: x })));
        });

        it("should show a matching predefined option if the option starts with the value", async () => {
            const data = createMockAutocompleteInteraction({
                id: "49072635294295155",
                name: "ban",
                options: [],
                type: ApplicationCommandType.ChatInput
            });
            const interaction = new AutocompleteInteraction(data, command.client, vi.fn());

            const result = await command.options[1].autocomplete?.(
                COMMON_SEVERE_REASONS[0].slice(0, 5) as never,
                interaction
            );

            expect(result).toEqual([{
                name: COMMON_SEVERE_REASONS[0],
                value: COMMON_SEVERE_REASONS[0]
            }]);
        });
    });
});
