import {
    type Case,
    type ModerationSettings,
    CaseType
} from "@prisma/client";
import type { WarnOptions } from "../../../../../src/types/moderation.js";

import {
    createMockApplicationCommandInteraction,
    mockChannel,
    mockGuild,
    mockMember,
    mockMessage,
    mockUser
} from "@barry/testing";
import { ApplicationCommandInteraction } from "@barry/core";
import { DiscordAPIError } from "@discordjs/rest";
import { createMockApplication } from "../../../../mocks/application.js";
import { mockCase } from "../../mocks/case.js";
import { warn } from "../../../../../src/modules/moderation/functions/actions/warn.js";

import ModerationModule from "../../../../../src/modules/moderation/index.js";
import * as actions from "../../../../../src/modules/moderation/functions/actions/actions.js";
import * as permissions from "../../../../../src/modules/moderation/functions/permissions.js";

describe("warn", () => {
    let interaction: ApplicationCommandInteraction;
    let entity: Case;
    let module: ModerationModule;
    let options: WarnOptions;
    let settings: ModerationSettings;

    beforeEach(() => {
        const client = createMockApplication();
        module = new ModerationModule(client);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client, vi.fn());

        entity = { ...mockCase, type: CaseType.Warn };
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

        vi.spyOn(actions, "respond").mockResolvedValue(undefined);
        vi.spyOn(client.api.channels, "createMessage").mockResolvedValue(mockMessage);
        vi.spyOn(client.api.guilds, "get").mockResolvedValue(mockGuild);
        vi.spyOn(client.api.guilds, "getMember").mockResolvedValue(mockMember);
        vi.spyOn(client.api.users, "createDM").mockResolvedValue({ ...mockChannel, position: 0 });
        vi.spyOn(module.cases, "create").mockResolvedValue(entity);
        vi.spyOn(module.cases, "getByUser").mockResolvedValue([]);
        vi.spyOn(module.settings, "getOrCreate").mockResolvedValue(settings);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("should ignore if the interaction was sent outside a guild", async () => {
        delete interaction.guildID;

        await warn(module, interaction, options);

        expect(interaction.acknowledged).toBe(false);
    });

    it("should show an error message if the moderator tries to warn themselves", async () => {
        options.member.user.id = interaction.user.id;

        await warn(module, interaction, options);

        expect(actions.respond).toHaveBeenCalledOnce();
        expect(actions.respond).toHaveBeenCalledWith(interaction, expect.stringContaining("You cannot warn yourself."));
    });

    it("should show an error message if the moderator tries to warn the bot", async () => {
        options.member.user.id = module.client.applicationID;

        await warn(module, interaction, options);

        expect(actions.respond).toHaveBeenCalledOnce();
        expect(actions.respond).toHaveBeenCalledWith(interaction, expect.stringContaining("Your attempt to warn me has been classified as a failed comedy show audition."));
    });

    it("should show an error message if the moderator is below the target", async () => {
        vi.spyOn(permissions, "isAboveMember").mockReturnValue(false);

        await warn(module, interaction, options);

        expect(actions.respond).toHaveBeenCalledOnce();
        expect(actions.respond).toHaveBeenCalledWith(interaction, expect.stringContaining("You cannot warn a member with a higher or equal role to you."));
    });

    it("should show an error message if the bot is below the target", async () => {
        vi.spyOn(permissions, "isAboveMember")
            .mockReturnValueOnce(true)
            .mockReturnValue(false);

        await warn(module, interaction, options);

        expect(actions.respond).toHaveBeenCalledOnce();
        expect(actions.respond).toHaveBeenCalledWith(interaction, expect.stringContaining("I cannot warn a member with a higher or equal role to me."));
    });

    it("should send a direct message to the target", async () => {
        vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
        const createSpy = vi.spyOn(module.client.api.channels, "createMessage");

        await warn(module, interaction, options);

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
        vi.spyOn(module.client.api.channels, "createMessage").mockRejectedValue(error);
        vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);

        await warn(module, interaction, options);

        expect(module.client.logger.error).toHaveBeenCalledOnce();
        expect(module.client.logger.error).toHaveBeenCalledWith(error);
    });

    it("should create a new case in the database", async () => {
        vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
        const createSpy = vi.spyOn(module.cases, "create");

        await warn(module, interaction, options);

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
        const createSpy = vi.spyOn(module, "createLogMessage");

        await warn(module, interaction, options);

        expect(createSpy).toHaveBeenCalledOnce();
        expect(createSpy).toHaveBeenCalledWith(settings.channelID, {
            case: entity,
            creator: interaction.user,
            reason: options.reason,
            user: options.member.user
        });
    });

    it("should not log the case if there is no log channel configured", async () => {
        vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
        const createSpy = vi.spyOn(module, "createLogMessage");
        settings.channelID = null;

        await warn(module, interaction, options);

        expect(createSpy).not.toHaveBeenCalled();
    });

    describe("createSuccessMessage", () => {
        let error: Error;

        beforeEach(() => {

            const response = {
                code: 50007,
                message: "Cannot send messages to this user"
            };

            error = new DiscordAPIError(response, 50007, 200, "GET", "", {});

            vi.spyOn(module.cases, "getByUser").mockResolvedValue([]);
        });

        it("should send a success message to the moderator", async () => {
            vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);

            await warn(module, interaction, options);

            expect(actions.respond).toHaveBeenCalledOnce();
            expect(actions.respond).toHaveBeenCalledWith(interaction, expect.stringContaining(`Case \`34\` | Successfully warned \`${options.member.user.username}\`.`));
        });

        it("should send a success message if the target's DMs are disabled", async () => {
            vi.spyOn(module.client.api.channels, "createMessage").mockRejectedValue(error);
            vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);

            await warn(module, interaction, options);

            expect(actions.respond).toHaveBeenCalledOnce();
            expect(actions.respond).toHaveBeenCalledWith(interaction, expect.stringContaining(`Case \`34\` | Successfully warned \`${options.member.user.username}\`. However, they have disabled their DMs, so I was unable to notify them.`));
        });

        it("should send a success message if the target has already received a warning before", async () => {
            vi.spyOn(module.cases, "getByUser").mockResolvedValue([
                { id: 1 } as Case,
                { id: 34 } as Case
            ]);
            vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);

            await warn(module, interaction, options);

            expect(actions.respond).toHaveBeenCalledOnce();
            expect(actions.respond).toHaveBeenCalledWith(interaction, expect.stringContaining(`Case \`34\` | Successfully warned \`${options.member.user.username}\`. They already have a warning; please review their previous cases and take action if needed.`));
        });

        it("should send a success message if the target has already received multiple warnings before", async () => {
            vi.spyOn(module.cases, "getByUser").mockResolvedValue([
                { id: 1 } as Case,
                { id: 5 } as Case,
                { id: 34 } as Case
            ]);
            vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);

            await warn(module, interaction, options);

            expect(actions.respond).toHaveBeenCalledOnce();
            expect(actions.respond).toHaveBeenCalledWith(interaction, expect.stringContaining(`Case \`34\` | Successfully warned \`${options.member.user.username}\`. They currently have \`2\` warnings; please review their previous cases and take action if needed.`));
        });

        it("should send a success message if the target's DMs are disabled and they have already received a warning before", async () => {
            vi.spyOn(module.client.api.channels, "createMessage").mockRejectedValue(error);
            vi.spyOn(module.cases, "getByUser").mockResolvedValue([
                { id: 1 } as Case,
                { id: 34 } as Case
            ]);
            vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);

            await warn(module, interaction, options);

            expect(actions.respond).toHaveBeenCalledOnce();
            expect(actions.respond).toHaveBeenCalledWith(interaction, expect.stringContaining(`Case \`34\` | Successfully warned \`${options.member.user.username}\`. However, they have disabled their DMs, so I was unable to notify them. They already have a warning; please review their previous cases and take action if needed.`));
        });

        it("should send a success message if the target's DMs are disabled and they have already received multiple warnings before", async () => {
            vi.spyOn(module.client.api.channels, "createMessage").mockRejectedValue(error);
            vi.spyOn(module.cases, "getByUser").mockResolvedValue([
                { id: 1 } as Case,
                { id: 5 } as Case,
                { id: 34 } as Case
            ]);
            vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);

            await warn(module, interaction, options);

            expect(actions.respond).toHaveBeenCalledOnce();
            expect(actions.respond).toHaveBeenCalledWith(interaction, expect.stringContaining(`Case \`34\` | Successfully warned \`${options.member.user.username}\`. However, they have disabled their DMs, so I was unable to notify them. They currently have \`2\` warnings; please review their previous cases and take action if needed.`));
        });
    });
});
