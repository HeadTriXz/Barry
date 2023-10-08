import {
    type Case,
    type ProfilesSettings,
    type RequestsSettings,
    type ModerationSettings,
    CaseType
} from "@prisma/client";
import type { DWCOptions } from "../../../../../src/types/moderation.js";

import {
    createMockApplicationCommandInteraction,
    mockUser,
    mockChannel,
    mockGuild,
    mockRole,
    mockMember,
    mockMessage
} from "@barry/testing";
import { ApplicationCommandInteraction } from "@barry/core";
import { ApplicationCommandType } from "@discordjs/core";
import { DiscordAPIError } from "@discordjs/rest";
import { createMockApplication } from "../../../../mocks/application.js";
import { dwc } from "../../../../../src/modules/moderation/functions/actions/dwc.js";
import { mockCase } from "../../mocks/case.js";

import MarketplaceModule from "../../../../../src/modules/marketplace/index.js";
import ModerationModule from "../../../../../src/modules/moderation/index.js";
import ProfilesModule from "../../../../../src/modules/marketplace/dependencies/profiles/index.js";
import RequestsModule from "../../../../../src/modules/marketplace/dependencies/requests/index.js";

import * as actions from "../../../../../src/modules/moderation/functions/actions/actions.js";
import * as permissions from "../../../../../src/modules/moderation/functions/permissions.js";
import * as utils from "../../../../../src/modules/moderation/functions/getDWCRole.js";

describe("dwc", () => {
    let entity: Case;
    let interaction: ApplicationCommandInteraction;
    let module: ModerationModule;
    let options: DWCOptions;

    let marketplaceModule: MarketplaceModule;
    let profilesModule: ProfilesModule;
    let requestsModule: RequestsModule;

    let profilesSettings: ProfilesSettings;
    let requestsSettings: RequestsSettings;
    let settings: ModerationSettings;

    beforeEach(async () => {
        const client = createMockApplication();
        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client, vi.fn());

        module = new ModerationModule(client);
        marketplaceModule = new MarketplaceModule(client);
        profilesModule = new ProfilesModule(client);
        requestsModule = new RequestsModule(client);

        await client.modules.add(marketplaceModule);
        await marketplaceModule.dependencies.add(profilesModule);
        await marketplaceModule.dependencies.add(requestsModule);

        entity = { ...mockCase, type: CaseType.DWC };
        options = {
            member: {
                ...mockMember,
                user: { ...mockUser, id: "257522665437265920" }
            },
            reason: "Hello World!",
            user: { ...mockUser, id: "257522665437265920" }
        };
        profilesSettings = {
            channelID: mockChannel.id,
            enabled: true,
            guildID: mockGuild.id,
            lastMessageID: null
        };
        requestsSettings = {
            channelID: mockChannel.id,
            enabled: true,
            guildID: mockGuild.id,
            lastMessageID: null,
            minCompensation: 50
        };
        settings = {
            channelID: mockChannel.id,
            dwcDays: 7,
            dwcRoleID: mockRole.id,
            enabled: true,
            guildID: mockGuild.id
        };

        client.api.guilds.addRoleToMember = vi.fn();
        module.createLogMessage = vi.fn();
        profilesModule.flagUser = vi.fn();
        requestsModule.flagUser = vi.fn();

        vi.spyOn(actions, "respond").mockResolvedValue(undefined);
        vi.spyOn(client.api.channels, "createMessage").mockResolvedValue(mockMessage);
        vi.spyOn(client.api.guilds, "get").mockResolvedValue(mockGuild);
        vi.spyOn(client.api.guilds, "getMember").mockResolvedValue({
            ...mockMember,
            user: {
                ...mockUser,
                id: client.applicationID
            }
        });
        vi.spyOn(client.api.users, "createDM").mockResolvedValue({ ...mockChannel, position: 0 });
        vi.spyOn(module.dwcScheduledBans, "get").mockResolvedValue(null);
        vi.spyOn(module.settings, "getOrCreate").mockResolvedValue(settings);
        vi.spyOn(module.cases, "create").mockResolvedValue(entity);
        vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
        vi.spyOn(profilesModule.settings, "getOrCreate").mockResolvedValue(profilesSettings);
        vi.spyOn(requestsModule.settings, "getOrCreate").mockResolvedValue(requestsSettings);
        vi.spyOn(utils, "getDWCRole").mockResolvedValue(mockRole);
    });

    it("should add the DWC role to the user", async () => {
        await dwc(module, interaction, options);

        expect(module.client.api.guilds.addRoleToMember).toHaveBeenCalledOnce();
        expect(module.client.api.guilds.addRoleToMember).toHaveBeenCalledWith(
            interaction.guildID,
            options.user.id,
            mockRole.id,
            {
                reason: options.reason
            }
        );
    });

    it("should notify the user that they have been flagged", async () => {
        const createSpy = vi.spyOn(module.client.api.channels, "createMessage");

        await dwc(module, interaction, options);

        expect(createSpy).toHaveBeenCalledOnce();
        expect(createSpy).toHaveBeenCalledWith(mockChannel.id, {
            embeds: [{
                color: expect.any(Number),
                description: expect.stringContaining("You have been marked with `Deal With Caution`"),
                fields: [{
                    name: "**Reason**",
                    value: options.reason
                }]
            }]
        });
    });

    it("should create a scheduled ban", async () => {
        const createSpy = vi.spyOn(module.dwcScheduledBans, "create");

        await dwc(module, interaction, options);

        expect(createSpy).toHaveBeenCalledOnce();
        expect(createSpy).toHaveBeenCalledWith(mockGuild.id, options.user.id);
    });

    it("should create a new case", async () => {
        const createSpy = vi.spyOn(module.cases, "create");

        await dwc(module, interaction, options);

        expect(createSpy).toHaveBeenCalledOnce();
        expect(createSpy).toHaveBeenCalledWith({
            creatorID: interaction.user.id,
            guildID: interaction.guildID,
            note: options.reason,
            type: CaseType.DWC,
            userID: options.user.id
        });
    });

    it("should send a success message", async () => {
        await dwc(module, interaction, options);

        expect(actions.respond).toHaveBeenCalledOnce();
        expect(actions.respond).toHaveBeenCalledWith(interaction, expect.stringContaining(`Case \`34\` | Successfully flagged \`${options.user.username}\`.`));
    });

    it("should log the case in the configured log channel", async () => {
        await dwc(module, interaction, options);

        expect(module.createLogMessage).toHaveBeenCalledOnce();
        expect(module.createLogMessage).toHaveBeenCalledWith(settings.channelID, {
            case: entity,
            creator: interaction.user,
            reason: options.reason,
            user: options.user
        });
    });

    it("should not log the case if there is no log channel configured", async () => {
        settings.channelID = null;

        await dwc(module, interaction, options);

        expect(module.createLogMessage).not.toHaveBeenCalled();
    });

    it("should flag the profile messages of the user", async () => {
        await dwc(module, interaction, options);

        expect(profilesModule.flagUser).toHaveBeenCalledOnce();
        expect(profilesModule.flagUser).toHaveBeenCalledWith(
            interaction.guildID,
            profilesSettings.channelID,
            options.user,
            options.reason
        );
    });

    it("should not flag the profile messages if the profiles module is not found", async () => {
        marketplaceModule.dependencies.delete(profilesModule.id);

        await dwc(module, interaction, options);

        expect(profilesModule.flagUser).not.toHaveBeenCalled();
    });

    it("should not flag the profile messages if the channel is not configured", async () => {
        profilesSettings.channelID = null;

        await dwc(module, interaction, options);

        expect(profilesModule.flagUser).not.toHaveBeenCalled();
    });

    it("should flag the requests of the user", async () => {
        await dwc(module, interaction, options);

        expect(requestsModule.flagUser).toHaveBeenCalledOnce();
        expect(requestsModule.flagUser).toHaveBeenCalledWith(
            interaction.guildID,
            profilesSettings.channelID,
            options.user,
            options.reason
        );
    });

    it("should not flag the requests if the profiles module is not found", async () => {
        marketplaceModule.dependencies.delete(requestsModule.id);

        await dwc(module, interaction, options);

        expect(requestsModule.flagUser).not.toHaveBeenCalled();
    });

    it("should not flag the requests if the channel is not configured", async () => {
        requestsSettings.channelID = null;

        await dwc(module, interaction, options);

        expect(requestsModule.flagUser).not.toHaveBeenCalled();
    });

    describe("Validation", () => {
        it("should ignore if the interaction is not invoked in a guild", async () => {
            delete interaction.guildID;

            await dwc(module, interaction, options);

            expect(interaction.acknowledged).toBe(false);
        });

        it("should ignore if the command is not of type 'CHAT_INPUT'", async () => {
            interaction.data.type = ApplicationCommandType.User;

            await dwc(module, interaction, options);

            expect(interaction.acknowledged).toBe(false);
        });

        it("should show an error message if the user is already flagged", async () => {
            vi.spyOn(module.dwcScheduledBans, "get").mockResolvedValue(entity);

            await dwc(module, interaction, options);

            expect(actions.respond).toHaveBeenCalledOnce();
            expect(actions.respond).toHaveBeenCalledWith(interaction, expect.stringContaining("That user is already flagged."));
        });

        it("should show an error message if the user is trying to flag themselves", async () => {
            options.user = interaction.user;

            await dwc(module, interaction, options);

            expect(actions.respond).toHaveBeenCalledOnce();
            expect(actions.respond).toHaveBeenCalledWith(interaction, expect.stringContaining("You cannot flag yourself."));
        });

        it("should show an error message if the user is trying to flag the bot", async () => {
            options.user.id = module.client.applicationID;

            await dwc(module, interaction, options);

            expect(actions.respond).toHaveBeenCalledOnce();
            expect(actions.respond).toHaveBeenCalledWith(interaction, expect.stringContaining("Your attempt to flag me has been classified as a failed comedy show audition."));
        });

        it("should show an error message if the user is trying to flag a member that is above them", async () => {
            vi.spyOn(permissions, "isAboveMember").mockReturnValue(false);

            await dwc(module, interaction, options);

            expect(actions.respond).toHaveBeenCalledOnce();
            expect(actions.respond).toHaveBeenCalledWith(interaction, expect.stringContaining("You cannot flag this member."));
        });

        it("should show an error message if the bot is trying to flag a member that is above them", async () => {
            vi.spyOn(permissions, "isAboveMember")
                .mockReturnValueOnce(true)
                .mockReturnValue(false);

            await dwc(module, interaction, options);

            expect(actions.respond).toHaveBeenCalledOnce();
            expect(actions.respond).toHaveBeenCalledWith(interaction, expect.stringContaining("I cannot flag this member."));
        });
    });

    describe("Error Handling", () => {
        it("should show an error message if the bot couldn't create the DWC role", async () => {
            vi.spyOn(utils, "getDWCRole").mockResolvedValue(undefined);

            await dwc(module, interaction, options);

            expect(actions.respond).toHaveBeenCalledOnce();
            expect(actions.respond).toHaveBeenCalledWith(interaction, expect.stringContaining("Failed to create the DWC role."));
        });

        it("should show an error message if the bot couldn't add the DWC role to the user", async () => {
            const error = new Error("Oh no!");
            vi.spyOn(module.client.api.guilds, "addRoleToMember").mockRejectedValue(error);

            await dwc(module, interaction, options);

            expect(actions.respond).toHaveBeenCalledOnce();
            expect(actions.respond).toHaveBeenCalledWith(interaction, expect.stringContaining("Failed to add the DWC role to the member."));
        });

        it("should log an error if the message fails due to an unknown error", async () => {
            const error = new Error("Oh no!");
            vi.spyOn(module.client.api.channels, "createMessage").mockRejectedValue(error);

            await dwc(module, interaction, options);

            expect(module.client.logger.error).toHaveBeenCalledOnce();
            expect(module.client.logger.error).toHaveBeenCalledWith(error);
        });

        it("should not log an error if the user has their DMs disabled", async () => {
            const response = {
                code: 50007,
                message: "Cannot send messages to this user"
            };
            const error = new DiscordAPIError(response, 50007, 200, "POST", "", {});
            vi.spyOn(module.client.api.channels, "createMessage").mockRejectedValue(error);

            await dwc(module, interaction, options);

            expect(module.client.logger.error).not.toHaveBeenCalled();
        });
    });
});
