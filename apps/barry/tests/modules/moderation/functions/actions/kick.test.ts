import {
    type Case,
    type ModerationSettings,
    CaseType
} from "@prisma/client";
import type { KickOptions } from "../../../../../src/types/moderation.js";

import {
    createMockApplicationCommandInteraction,
    mockChannel,
    mockGuild,
    mockMember,
    mockMessage,
    mockUser
} from "@barry-bot/testing";
import { ApplicationCommandInteraction } from "@barry-bot/core";
import { createMockApplication } from "../../../../mocks/application.js";
import { mockCase } from "../../mocks/case.js";
import { kick } from "../../../../../src/modules/moderation/functions/actions/kick.js";

import ModerationModule from "../../../../../src/modules/moderation/index.js";
import * as actions from "../../../../../src/modules/moderation/functions/actions/actions.js";
import * as permissions from "../../../../../src/modules/moderation/functions/permissions.js";

describe("kick", () => {
    let interaction: ApplicationCommandInteraction;
    let entity: Case;
    let module: ModerationModule;
    let options: KickOptions;
    let settings: ModerationSettings;

    beforeEach(() => {
        const client = createMockApplication();
        module = new ModerationModule(client);

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

        module.createLogMessage = vi.fn();
        module.notifyUser = vi.fn();
        vi.spyOn(actions, "respond").mockResolvedValue(undefined);
        vi.spyOn(client.api.channels, "createMessage").mockResolvedValue(mockMessage);
        vi.spyOn(client.api.guilds, "get").mockResolvedValue(mockGuild);
        vi.spyOn(client.api.guilds, "getMember").mockResolvedValue(mockMember);
        vi.spyOn(client.api.guilds, "removeMember").mockResolvedValue(undefined);
        vi.spyOn(client.api.users, "createDM").mockResolvedValue({ ...mockChannel, position: 0 });
        vi.spyOn(module.cases, "create").mockResolvedValue(entity);
        vi.spyOn(module.settings, "getOrCreate").mockResolvedValue(settings);
    });

    it("should ignore if the interaction was sent outside a guild", async () => {
        delete interaction.guildID;

        await kick(module, interaction, options);

        expect(interaction.acknowledged).toBe(false);
    });

    it("should show an error message if the moderator tries to warn themselves", async () => {
        options.member.user.id = interaction.user.id;

        await kick(module, interaction, options);

        expect(actions.respond).toHaveBeenCalledOnce();
        expect(actions.respond).toHaveBeenCalledWith(interaction, expect.stringContaining("You cannot kick yourself."));
    });

    it("should show an error message if the moderator tries to warn the bot", async () => {
        options.member.user.id = module.client.applicationID;

        await kick(module, interaction, options);

        expect(actions.respond).toHaveBeenCalledOnce();
        expect(actions.respond).toHaveBeenCalledWith(interaction, expect.stringContaining("Your attempt to kick me has been classified as a failed comedy show audition."));
    });

    it("should show an error message if the moderator is below the target", async () => {
        vi.spyOn(permissions, "isAboveMember").mockReturnValue(false);

        await kick(module, interaction, options);

        expect(actions.respond).toHaveBeenCalledOnce();
        expect(actions.respond).toHaveBeenCalledWith(interaction, expect.stringContaining("You cannot kick this member."));
    });

    it("should show an error message if the bot is below the target", async () => {
        vi.spyOn(permissions, "isAboveMember")
            .mockReturnValueOnce(true)
            .mockReturnValue(false);

        await kick(module, interaction, options);

        expect(actions.respond).toHaveBeenCalledOnce();
        expect(actions.respond).toHaveBeenCalledWith(interaction, expect.stringContaining("I cannot kick this member."));
    });

    it("should send a direct message to the target", async () => {
        vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);

        await kick(module, interaction, options);

        expect(module.notifyUser).toHaveBeenCalledOnce();
        expect(module.notifyUser).toHaveBeenCalledWith({
            guild: mockGuild,
            reason: options.reason,
            type: CaseType.Kick,
            userID: options.member.user.id
        });
    });

    it("should kick the member from the guild", async () => {
        vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
        const removeSpy = vi.spyOn(module.client.api.guilds, "removeMember");

        await kick(module, interaction, options);

        expect(removeSpy).toHaveBeenCalledOnce();
        expect(removeSpy).toHaveBeenCalledWith(mockGuild.id, options.member.user.id, {
            reason: options.reason
        });
    });

    it("should log an error if the kick fails due to an unknown error", async () => {
        const error = new Error("Oh no!");
        vi.spyOn(module.client.api.guilds, "removeMember").mockRejectedValueOnce(error);
        vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);

        await kick(module, interaction, options);

        expect(module.client.logger.error).toHaveBeenCalledOnce();
        expect(module.client.logger.error).toHaveBeenCalledWith(error);
    });

    it("should create a new case in the database", async () => {
        vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
        const createSpy = vi.spyOn(module.cases, "create");

        await kick(module, interaction, options);

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

        await kick(module, interaction, options);

        expect(actions.respond).toHaveBeenCalledOnce();
        expect(actions.respond).toHaveBeenCalledWith(interaction, expect.stringContaining(`Case \`34\` | Successfully kicked \`${options.member.user.username}\``));
    });

    it("should log the case in the configured log channel", async () => {
        vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);

        await kick(module, interaction, options);

        expect(module.createLogMessage).toHaveBeenCalledOnce();
        expect(module.createLogMessage).toHaveBeenCalledWith(settings.channelID, {
            case: entity,
            creator: interaction.user,
            reason: options.reason,
            user: options.member.user
        });
    });

    it("should not log the case if there is no log channel configured", async () => {
        vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
        settings.channelID = null;

        await kick(module, interaction, options);

        expect(module.createLogMessage).not.toHaveBeenCalled();
    });
});
