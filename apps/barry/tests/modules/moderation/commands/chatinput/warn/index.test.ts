import { type Case, type ModerationSettings, CaseType } from "@prisma/client";

import { ApplicationCommandInteraction, AutocompleteInteraction } from "@barry/core";
import { ApplicationCommandType, MessageFlags } from "@discordjs/core";
import {
    createMockApplicationCommandInteraction,
    createMockAutocompleteInteraction,
    mockChannel,
    mockMember,
    mockMessage,
    mockUser
} from "@barry/testing";

import { COMMON_MINOR_REASONS } from "../../../../../../src/modules/moderation/constants.js";
import { DiscordAPIError } from "@discordjs/rest";
import { createMockApplication } from "../../../../../mocks/application.js";
import { mockGuild } from "@barry/testing";

import WarnCommand, { type WarnOptions } from "../../../../../../src/modules/moderation/commands/chatinput/warn/index.js";
import ModerationModule from "../../../../../../src/modules/moderation/index.js";

import * as permissions from "../../../../../../src/modules/moderation/functions/permissions.js";

describe("/warn", () => {
    let command: WarnCommand;
    let interaction: ApplicationCommandInteraction;
    let mockCase: Case;
    let options: WarnOptions;
    let settings: ModerationSettings;

    beforeEach(() => {
        const client = createMockApplication();

        const module = new ModerationModule(client);
        command = new WarnCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client, vi.fn());

        mockCase = {
            createdAt: new Date("1-1-2023"),
            creatorID: mockUser.id,
            guildID: mockGuild.id,
            id: 34,
            type: CaseType.Warn,
            userID: "257522665437265920"
        };
        options = {
            member: {
                ...mockMember,
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

        vi.spyOn(client.api.channels, "createMessage").mockResolvedValue(mockMessage);
        vi.spyOn(client.api.guilds, "get").mockResolvedValue(mockGuild);
        vi.spyOn(client.api.guilds, "getMember").mockResolvedValue(mockMember);
        vi.spyOn(client.api.users, "createDM").mockResolvedValue({ ...mockChannel, position: 0 });
        vi.spyOn(module.cases, "create").mockResolvedValue(mockCase);
        vi.spyOn(module.cases, "getByUser").mockResolvedValue([]);
        vi.spyOn(module.moderationSettings, "getOrCreate").mockResolvedValue(settings);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("execute", () => {
        it("should ignore if the interaction was sent outside a guild", async () => {
            delete interaction.guildID;

            await command.execute(interaction, options);

            expect(interaction.acknowledged).toBe(false);
        });

        it("should show an error message if the moderator tries to warn themselves", async () => {
            const createSpy = vi.spyOn(interaction, "createMessage");
            options.member.user.id = interaction.user.id;

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("You cannot warn yourself."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should show an error message if the moderator tries to warn the bot", async () => {
            const createSpy = vi.spyOn(interaction, "createMessage");
            options.member.user.id = command.client.applicationID;

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("Your attempt to warn me has been classified as a failed comedy show audition."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should show an error message if the moderator is below the target", async () => {
            vi.spyOn(permissions, "isAboveMember").mockReturnValue(false);
            const createSpy = vi.spyOn(interaction, "createMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("You cannot warn a member with a higher or equal role to you."),
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
                content: expect.stringContaining("I cannot warn a member with a higher or equal role to me."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should send a direct message to the target", async () => {
            vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
            const createSpy = vi.spyOn(command.client.api.channels, "createMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledTimes(2);
            expect(createSpy).toHaveBeenCalledWith(mockChannel.id, {
                embeds: [{
                    color: expect.any(Number),
                    description: expect.stringContaining("You have been warned in **Barry's Server**"),
                    fields: [{
                        name: "**Reason**",
                        value: options.reason
                    }]
                }]
            });
        });

        it("should log an error if the direct message fails due to an unknown error", async () => {
            const error = new Error("Oh no!");
            vi.spyOn(command.client.api.channels, "createMessage").mockRejectedValue(error);
            vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);

            await command.execute(interaction, options);

            expect(command.client.logger.error).toHaveBeenCalledOnce();
            expect(command.client.logger.error).toHaveBeenCalledWith(error);
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
                type: CaseType.Warn,
                userID: options.member.user.id
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
                user: options.member.user
            }, settings);
        });
    });

    describe("#onSuccess", () => {
        let error: Error;

        beforeEach(() => {
            const response = {
                code: 50007,
                message: "Cannot send messages to this user"
            };

            error = new DiscordAPIError(response, 50007, 200, "GET", "", {});
        });

        it("should send a success message to the moderator", async () => {
            vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
            const createSpy = vi.spyOn(interaction, "createMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining(`Case \`34\` | Successfully warned \`${options.member.user.username}\`.`),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should send a success message if the target's DMs are disabled", async () => {
            vi.spyOn(command.client.api.channels, "createMessage").mockRejectedValue(error);
            vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
            const createSpy = vi.spyOn(interaction, "createMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining(`Case \`34\` | Successfully warned \`${options.member.user.username}\`. However, they have disabled their DMs, so I was unable to notify them.`),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should send a success message if the target has already received a warning before", async () => {
            vi.spyOn(command.module.cases, "getByUser").mockResolvedValue([
                { id: 1 } as Case,
                { id: 34 } as Case
            ]);
            vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
            const createSpy = vi.spyOn(interaction, "createMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining(`Case \`34\` | Successfully warned \`${options.member.user.username}\`. They already have a warning; please review their previous cases and take action if needed.`),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should send a success message if the target has already received multiple warnings before", async () => {
            vi.spyOn(command.module.cases, "getByUser").mockResolvedValue([
                { id: 1 } as Case,
                { id: 5 } as Case,
                { id: 34 } as Case
            ]);
            vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
            const createSpy = vi.spyOn(interaction, "createMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining(`Case \`34\` | Successfully warned \`${options.member.user.username}\`. They currently have \`2\` warnings; please review their previous cases and take action if needed.`),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should send a success message if the target's DMs are disabled and they have already received a warning before", async () => {
            vi.spyOn(command.client.api.channels, "createMessage").mockRejectedValue(error);
            vi.spyOn(command.module.cases, "getByUser").mockResolvedValue([
                { id: 1 } as Case,
                { id: 34 } as Case
            ]);
            vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
            const createSpy = vi.spyOn(interaction, "createMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining(`Case \`34\` | Successfully warned \`${options.member.user.username}\`. However, they have disabled their DMs, so I was unable to notify them. They already have a warning; please review their previous cases and take action if needed.`),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should send a success message if the target's DMs are disabled and they have already received multiple warnings before", async () => {
            vi.spyOn(command.client.api.channels, "createMessage").mockRejectedValue(error);
            vi.spyOn(command.module.cases, "getByUser").mockResolvedValue([
                { id: 1 } as Case,
                { id: 5 } as Case,
                { id: 34 } as Case
            ]);
            vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
            const createSpy = vi.spyOn(interaction, "createMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining(`Case \`34\` | Successfully warned \`${options.member.user.username}\`. However, they have disabled their DMs, so I was unable to notify them. They currently have \`2\` warnings; please review their previous cases and take action if needed.`),
                flags: MessageFlags.Ephemeral
            });
        });
    });

    describe("Autocomplete 'reason'", () => {
        it("should show a predefined list of reasons if no value is provided", async () => {
            const data = createMockAutocompleteInteraction({
                id: "49072635294295155",
                name: "warn",
                options: [],
                type: ApplicationCommandType.ChatInput
            });
            const interaction = new AutocompleteInteraction(data, command.client, vi.fn());

            const result = await command.options[1].autocomplete?.("" as never, interaction);

            expect(result).toEqual(COMMON_MINOR_REASONS.map((x) => ({ name: x, value: x })));
        });

        it("should show a matching predefined option if the option starts with the value", async () => {
            const data = createMockAutocompleteInteraction({
                id: "49072635294295155",
                name: "warn",
                options: [],
                type: ApplicationCommandType.ChatInput
            });
            const interaction = new AutocompleteInteraction(data, command.client, vi.fn());

            const result = await command.options[1].autocomplete?.(
                COMMON_MINOR_REASONS[0].slice(0, 5) as never,
                interaction
            );

            expect(result).toEqual([{
                name: COMMON_MINOR_REASONS[0],
                value: COMMON_MINOR_REASONS[0]
            }]);
        });
    });
});
