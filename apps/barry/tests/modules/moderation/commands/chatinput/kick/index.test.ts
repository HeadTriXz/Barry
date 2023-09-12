import { type Case, type ModerationSettings, CaseType } from "@prisma/client";
import { ApplicationCommandInteraction, AutocompleteInteraction } from "@barry/core";
import { ApplicationCommandType, MessageFlags } from "@discordjs/core";
import {
    createMockApplicationCommandInteraction,
    createMockAutocompleteInteraction,
    mockChannel,
    mockGuild,
    mockMember,
    mockMessage,
    mockUser
} from "@barry/testing";

import { COMMON_SEVERE_REASONS } from "../../../../../../src/modules/moderation/constants.js";
import { createMockApplication } from "../../../../../mocks/application.js";
import { mockCase } from "../../../mocks/case.js";

import KickCommand, { type KickOptions } from "../../../../../../src/modules/moderation/commands/chatinput/kick/index.js";
import ModerationModule from "../../../../../../src/modules/moderation/index.js";
import * as permissions from "../../../../../../src/modules/moderation/functions/permissions.js";

describe("/kick", () => {
    let command: KickCommand;
    let interaction: ApplicationCommandInteraction;
    let entity: Case;
    let options: KickOptions;
    let settings: ModerationSettings;

    beforeEach(() => {
        const client = createMockApplication();

        const module = new ModerationModule(client);
        command = new KickCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client, vi.fn());

        entity = { ...mockCase, type: CaseType.Kick };
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

        module.notifyUser = vi.fn();
        vi.spyOn(client.api.channels, "createMessage").mockResolvedValue(mockMessage);
        vi.spyOn(client.api.guilds, "get").mockResolvedValue(mockGuild);
        vi.spyOn(client.api.guilds, "getMember").mockResolvedValue(mockMember);
        vi.spyOn(client.api.guilds, "removeMember").mockResolvedValue(undefined);
        vi.spyOn(client.api.users, "createDM").mockResolvedValue({ ...mockChannel, position: 0 });
        vi.spyOn(module.cases, "create").mockResolvedValue(entity);
        vi.spyOn(module.moderationSettings, "getOrCreate").mockResolvedValue(settings);
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
                content: expect.stringContaining("You cannot kick yourself."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should show an error message if the moderator tries to warn the bot", async () => {
            const createSpy = vi.spyOn(interaction, "createMessage");
            options.member.user.id = command.client.applicationID;

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("Your attempt to kick me has been classified as a failed comedy show audition."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should show an error message if the moderator is below the target", async () => {
            vi.spyOn(permissions, "isAboveMember").mockReturnValue(false);
            const createSpy = vi.spyOn(interaction, "createMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("You cannot kick this member."),
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
                content: expect.stringContaining("I cannot kick this member."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should send a direct message to the target", async () => {
            vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);

            await command.execute(interaction, options);

            expect(command.module.notifyUser).toHaveBeenCalledOnce();
            expect(command.module.notifyUser).toHaveBeenCalledWith({
                guild: mockGuild,
                reason: options.reason,
                type: CaseType.Kick,
                userID: options.member.user.id
            });
        });

        it("should kick the member from the guild", async () => {
            vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
            const removeSpy = vi.spyOn(command.client.api.guilds, "removeMember");

            await command.execute(interaction, options);

            expect(removeSpy).toHaveBeenCalledOnce();
            expect(removeSpy).toHaveBeenCalledWith(mockGuild.id, options.member.user.id, {
                reason: options.reason
            });
        });

        it("should log an error if the kick fails due to an unknown error", async () => {
            const error = new Error("Oh no!");
            vi.spyOn(command.client.api.guilds, "removeMember").mockRejectedValueOnce(error);
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
                type: CaseType.Kick,
                userID: options.member.user.id
            });
        });

        it("should show a success message to the moderator", async () => {
            vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
            const createSpy = vi.spyOn(interaction, "createMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining(`Case \`34\` | Successfully kicked \`${options.member.user.username}\``),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should log the case in the configured log channel", async () => {
            vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
            const createSpy = vi.spyOn(command.module, "createLogMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                case: entity,
                creator: interaction.user,
                reason: options.reason,
                user: options.member.user
            }, settings);
        });
    });

    describe("Autocomplete 'reason'", () => {
        it("should show a predefined list of reasons if no value is provided", async () => {
            const data = createMockAutocompleteInteraction({
                id: "49072635294295155",
                name: "kick",
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
                name: "kick",
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
