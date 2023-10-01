import {
    type Case,
    type ModerationSettings,
    CaseType
} from "@prisma/client";
import type { MuteOptions } from "../../../../../dist/types/moderation.js";

import {
    createMockApplicationCommandInteraction,
    mockChannel,
    mockGuild,
    mockMember,
    mockMessage,
    mockUser
} from "@barry/testing";
import { ApplicationCommandInteraction } from "@barry/core";
import { MessageFlags } from "@discordjs/core";
import { createMockApplication } from "../../../../mocks/application.js";
import { mockCase } from "../../mocks/case.js";
import { mute } from "../../../../../src/modules/moderation/functions/actions/mute.js";

import ModerationModule from "../../../../../src/modules/moderation/index.js";
import * as duration from "../../../../../src/modules/moderation/functions/getDuration.js";
import * as permissions from "../../../../../src/modules/moderation/functions/permissions.js";

describe("mute", () => {
    let interaction: ApplicationCommandInteraction;
    let entity: Case;
    let module: ModerationModule;
    let options: MuteOptions;
    let settings: ModerationSettings;

    beforeEach(() => {
        vi.useFakeTimers().setSystemTime("1-1-2023");

        const client = createMockApplication();
        module = new ModerationModule(client);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client, vi.fn());

        entity = { ...mockCase, type: CaseType.Mute };
        options = {
            duration: "5m",
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
        vi.spyOn(client.api.guilds, "editMember").mockResolvedValue(mockMember);
        vi.spyOn(client.api.users, "createDM").mockResolvedValue({ ...mockChannel, position: 0 });
        vi.spyOn(module.cases, "create").mockResolvedValue(entity);
        vi.spyOn(module.settings, "getOrCreate").mockResolvedValue(settings);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it("should send a direct message to the target", async () => {
        vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);

        await mute(module, interaction, options);

        expect(module.notifyUser).toHaveBeenCalledOnce();
        expect(module.notifyUser).toHaveBeenCalledWith({
            duration: 300,
            guild: mockGuild,
            reason: options.reason,
            type: CaseType.Mute,
            userID: options.member.user.id
        });
    });

    it("should give the member a timeout", async () => {
        vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
        const editSpy = vi.spyOn(module.client.api.guilds, "editMember");

        await mute(module, interaction, options);

        expect(editSpy).toHaveBeenCalledOnce();
        expect(editSpy).toHaveBeenCalledWith(mockGuild.id, options.member.user.id, {
            communication_disabled_until: new Date(Date.now() + 300000).toISOString()
        }, {
            reason: options.reason
        });
    });

    it("should create a new case in the database", async () => {
        vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
        const createSpy = vi.spyOn(module.cases, "create");

        await mute(module, interaction, options);

        expect(createSpy).toHaveBeenCalledOnce();
        expect(createSpy).toHaveBeenCalledWith({
            creatorID: interaction.user.id,
            guildID: interaction.guildID,
            note: options.reason,
            type: CaseType.Mute,
            userID: options.member.user.id
        });
    });

    it("should show a success message to the moderator", async () => {
        vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
        const createSpy = vi.spyOn(interaction, "createMessage");

        await mute(module, interaction, options);

        expect(createSpy).toHaveBeenCalledOnce();
        expect(createSpy).toHaveBeenCalledWith({
            content: expect.stringContaining(`Case \`34\` | Successfully muted \`${options.member.user.username}\``),
            flags: MessageFlags.Ephemeral
        });
    });

    it("should log the case in the configured log channel", async () => {
        vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
        const createSpy = vi.spyOn(module, "createLogMessage");

        await mute(module, interaction, options);

        expect(createSpy).toHaveBeenCalledOnce();
        expect(createSpy).toHaveBeenCalledWith(settings.channelID, {
            case: entity,
            creator: interaction.user,
            duration: 300,
            reason: options.reason,
            user: options.member.user
        });
    });

    it("should not log the case if there is no log channel configured", async () => {
        vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
        const createSpy = vi.spyOn(module, "createLogMessage");
        settings.channelID = null;

        await mute(module, interaction, options);

        expect(createSpy).not.toHaveBeenCalled();
    });

    describe("Validating", () => {
        it("should ignore if the interaction was sent outside a guild", async () => {
            delete interaction.guildID;

            await mute(module, interaction, options);

            expect(interaction.acknowledged).toBe(false);
        });

        it("should show an error message if the moderator tries to warn themselves", async () => {
            const createSpy = vi.spyOn(interaction, "createMessage");
            options.member.user.id = interaction.user.id;

            await mute(module, interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("You cannot mute yourself."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should show an error message if the moderator tries to warn the bot", async () => {
            const createSpy = vi.spyOn(interaction, "createMessage");
            options.member.user.id = module.client.applicationID;

            await mute(module, interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("Your attempt to mute me has been classified as a failed comedy show audition."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should show an error message if the moderator is below the target", async () => {
            vi.spyOn(permissions, "isAboveMember").mockReturnValue(false);
            const createSpy = vi.spyOn(interaction, "createMessage");

            await mute(module, interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("You cannot mute this member."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should show an error message if the bot is below the target", async () => {
            vi.spyOn(permissions, "isAboveMember")
                .mockReturnValueOnce(true)
                .mockReturnValue(false);
            const createSpy = vi.spyOn(interaction, "createMessage");

            await mute(module, interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("I cannot mute this member."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should show an error message if the duration is less than 10 seconds", async () => {
            vi.spyOn(duration, "getDuration").mockReturnValue(5);
            const createSpy = vi.spyOn(interaction, "createMessage");

            await mute(module, interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("The duration must at least be 10 seconds."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should show an error message if the duration is more than 28 days", async () => {
            vi.spyOn(duration, "getDuration").mockReturnValue(2592000);
            const createSpy = vi.spyOn(interaction, "createMessage");

            await mute(module, interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("The duration must not exceed 28 days."),
                flags: MessageFlags.Ephemeral
            });
        });
    });

    describe("Error handling", () => {
        it("should log an error if the mute fails due to an unknown error", async () => {
            const error = new Error("Oh no!");
            vi.spyOn(module.client.api.guilds, "editMember").mockRejectedValueOnce(error);
            vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);

            await mute(module, interaction, options);

            expect(module.client.logger.error).toHaveBeenCalledOnce();
            expect(module.client.logger.error).toHaveBeenCalledWith(error);
        });
    });
});
