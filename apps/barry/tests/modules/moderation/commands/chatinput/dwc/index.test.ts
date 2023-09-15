import {
    type Case,
    type ModerationSettings,
    type ProfilesSettings,
    type RequestsSettings,
    CaseType
} from "@prisma/client";

import {
    ApplicationCommandType,
    MessageFlags,
    OverwriteType
} from "@discordjs/core";
import {
    createMockApplicationCommandInteraction,
    createMockAutocompleteInteraction,
    mockChannel,
    mockGuild,
    mockMember,
    mockMessage,
    mockRole,
    mockUser
} from "@barry/testing";

import { ApplicationCommandInteraction, AutocompleteInteraction } from "@barry/core";
import { COMMON_DWC_REASONS } from "../../../../../../src/modules/moderation/constants.js";
import { DiscordAPIError } from "@discordjs/rest";
import { createMockApplication } from "../../../../../mocks/application.js";
import { mockCase } from "../../../mocks/case.js";

import DWCCommand, { type DWCOptions } from "../../../../../../src/modules/moderation/commands/chatinput/dwc/index.js";
import MarketplaceModule from "../../../../../../src/modules/marketplace/index.js";
import ModerationModule from "../../../../../../src/modules/moderation/index.js";
import ProfilesModule from "../../../../../../src/modules/marketplace/dependencies/profiles/index.js";
import RequestsModule from "../../../../../../src/modules/marketplace/dependencies/requests/index.js";
import * as permissions from "../../../../../../src/modules/moderation/functions/permissions.js";

describe("/dwc", () => {
    let command: DWCCommand;
    let entity: Case;
    let interaction: ApplicationCommandInteraction;
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

        marketplaceModule = new MarketplaceModule(client);
        profilesModule = new ProfilesModule(client);
        requestsModule = new RequestsModule(client);

        await client.modules.add(marketplaceModule);
        await marketplaceModule.dependencies.add(profilesModule);
        await marketplaceModule.dependencies.add(requestsModule);

        const module = new ModerationModule(client);
        command = new DWCCommand(module);

        entity = { ...mockCase, type: CaseType.DWC };
        options = {
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

        if (interaction.data.isChatInput()) {
            interaction.data.resolved.members.set(options.user.id, {
                ...mockMember,
                permissions: "0",
                user: options.user
            });
        }

        profilesModule.flagUser = vi.fn();
        requestsModule.flagUser = vi.fn();
        vi.spyOn(module.moderationSettings, "getOrCreate").mockResolvedValue(settings);
        vi.spyOn(module.cases, "create").mockResolvedValue(entity);
        vi.spyOn(profilesModule.profilesSettings, "getOrCreate").mockResolvedValue(profilesSettings);
        vi.spyOn(requestsModule.requestsSettings, "getOrCreate").mockResolvedValue(requestsSettings);
    });

    describe("execute", () => {
        beforeEach(() => {
            command.client.api.guilds.addRoleToMember = vi.fn();
            command.module.createLogMessage = vi.fn();

            vi.spyOn(command, "getOrCreateRole").mockResolvedValue(mockRole);
            vi.spyOn(command.client.api.channels, "createMessage").mockResolvedValue(mockMessage);
            vi.spyOn(command.client.api.guilds, "get").mockResolvedValue(mockGuild);
            vi.spyOn(command.client.api.guilds, "getMember").mockResolvedValue({
                ...mockMember,
                user: {
                    ...mockUser,
                    id: command.client.applicationID
                }
            });
            vi.spyOn(command.client.api.users, "createDM").mockResolvedValue({ ...mockChannel, position: 0 });
            vi.spyOn(permissions, "isAboveMember").mockReturnValue(true);
        });

        it("should add the DWC role to the user", async () => {
            await command.execute(interaction, options);

            expect(command.client.api.guilds.addRoleToMember).toHaveBeenCalledOnce();
            expect(command.client.api.guilds.addRoleToMember).toHaveBeenCalledWith(
                interaction.guildID,
                options.user.id,
                mockRole.id,
                {
                    reason: options.reason
                }
            );
        });

        it("should notify the user that they have been flagged", async () => {
            const createSpy = vi.spyOn(command.client.api.channels, "createMessage");

            await command.execute(interaction, options);

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
            const createSpy = vi.spyOn(command.module.dwcScheduledBans, "create");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith(mockGuild.id, options.user.id);
        });

        it("should create a new case", async () => {
            const createSpy = vi.spyOn(command.module.cases, "create");

            await command.execute(interaction, options);

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
            const createSpy = vi.spyOn(interaction, "createMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining(`Case \`34\` | Successfully flagged \`${options.user.username}\`.`),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should log the case in the configured log channel", async () => {
            await command.execute(interaction, options);

            expect(command.module.createLogMessage).toHaveBeenCalledOnce();
            expect(command.module.createLogMessage).toHaveBeenCalledWith(settings.channelID, {
                case: entity,
                creator: interaction.user,
                reason: options.reason,
                user: options.user
            });
        });

        it("should not log the case if there is no log channel configured", async () => {
            settings.channelID = null;

            await command.execute(interaction, options);

            expect(command.module.createLogMessage).not.toHaveBeenCalled();
        });

        it("should flag the profile messages of the user", async () => {
            await command.execute(interaction, options);

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

            await command.execute(interaction, options);

            expect(profilesModule.flagUser).not.toHaveBeenCalled();
        });

        it("should not flag the profile messages if the channel is not configured", async () => {
            profilesSettings.channelID = null;

            await command.execute(interaction, options);

            expect(profilesModule.flagUser).not.toHaveBeenCalled();
        });

        it("should flag the requests of the user", async () => {
            await command.execute(interaction, options);

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

            await command.execute(interaction, options);

            expect(requestsModule.flagUser).not.toHaveBeenCalled();
        });

        it("should not flag the requests if the channel is not configured", async () => {
            requestsSettings.channelID = null;

            await command.execute(interaction, options);

            expect(requestsModule.flagUser).not.toHaveBeenCalled();
        });

        describe("Validation", () => {
            it("should ignore if the interaction is not invoked in a guild", async () => {
                delete interaction.guildID;

                await command.execute(interaction, options);

                expect(interaction.acknowledged).toBe(false);
            });

            it("should ignore if the command is not of type 'CHAT_INPUT'", async () => {
                interaction.data.type = ApplicationCommandType.User;

                await command.execute(interaction, options);

                expect(interaction.acknowledged).toBe(false);
            });

            it("should show an error message if the user is trying to flag themselves", async () => {
                const createSpy = vi.spyOn(interaction, "createMessage");
                options.user = interaction.user;

                await command.execute(interaction, options);

                expect(createSpy).toHaveBeenCalledOnce();
                expect(createSpy).toHaveBeenCalledWith({
                    content: expect.stringContaining("You cannot flag yourself."),
                    flags: MessageFlags.Ephemeral
                });
            });

            it("should show an error message if the user is trying to flag the bot", async () => {
                const createSpy = vi.spyOn(interaction, "createMessage");
                options.user.id = command.client.applicationID;

                await command.execute(interaction, options);

                expect(createSpy).toHaveBeenCalledOnce();
                expect(createSpy).toHaveBeenCalledWith({
                    content: expect.stringContaining("Your attempt to flag me has been classified as a failed comedy show audition."),
                    flags: MessageFlags.Ephemeral
                });
            });

            it("should show an error message if the user is trying to flag a member that is above them", async () => {
                vi.spyOn(permissions, "isAboveMember").mockReturnValue(false);
                const createSpy = vi.spyOn(interaction, "createMessage");

                await command.execute(interaction, options);

                expect(createSpy).toHaveBeenCalledOnce();
                expect(createSpy).toHaveBeenCalledWith({
                    content: expect.stringContaining("You cannot flag this member."),
                    flags: MessageFlags.Ephemeral
                });
            });

            it("should show an error message if the bot is trying to flag a member that is above them", async () => {
                vi.spyOn(permissions, "isAboveMember")
                    .mockReturnValueOnce(true)
                    .mockReturnValue(false);
                const createSpy = vi.spyOn(interaction, "createMessage");

                await command.execute(interaction, options);

                expect(createSpy).toHaveBeenCalledOnce();
                expect(createSpy).toHaveBeenCalledWith({
                    content: expect.stringContaining("I cannot flag this member."),
                    flags: MessageFlags.Ephemeral
                });
            });
        });

        describe("Error Handling", () => {
            it("should show an error message if the bot couldn't create the DWC role", async () => {
                vi.spyOn(command, "getOrCreateRole").mockResolvedValue(undefined);
                const createSpy = vi.spyOn(interaction, "createMessage");

                await command.execute(interaction, options);

                expect(createSpy).toHaveBeenCalledOnce();
                expect(createSpy).toHaveBeenCalledWith({
                    content: expect.stringContaining("Failed to create the DWC role."),
                    flags: MessageFlags.Ephemeral
                });
            });

            it("should show an error message if the bot couldn't add the DWC role to the user", async () => {
                const error = new Error("Oh no!");
                vi.spyOn(command.client.api.guilds, "addRoleToMember").mockRejectedValue(error);
                const createSpy = vi.spyOn(interaction, "createMessage");

                await command.execute(interaction, options);

                expect(createSpy).toHaveBeenCalledOnce();
                expect(createSpy).toHaveBeenCalledWith({
                    content: expect.stringContaining("Failed to add the DWC role to the member."),
                    flags: MessageFlags.Ephemeral
                });
            });

            it("should log an error if the message fails due to an unknown error", async () => {
                const error = new Error("Oh no!");
                vi.spyOn(command.client.api.channels, "createMessage").mockRejectedValue(error);

                await command.execute(interaction, options);

                expect(command.client.logger.error).toHaveBeenCalledOnce();
                expect(command.client.logger.error).toHaveBeenCalledWith(error);
            });

            it("should not log an error if the user has their DMs disabled", async () => {
                const response = {
                    code: 50007,
                    message: "Cannot send messages to this user"
                };
                const error = new DiscordAPIError(response, 50007, 200, "POST", "", {});
                vi.spyOn(command.client.api.channels, "createMessage").mockRejectedValue(error);

                await command.execute(interaction, options);

                expect(command.client.logger.error).not.toHaveBeenCalled();
            });
        });
    });

    describe("getOrCreateRole", () => {
        beforeEach(() => {
            command.client.api.channels.editPermissionOverwrite = vi.fn();
        });

        it("should return the existing DWC role if it exists", async () => {
            vi.spyOn(command.client.api.guilds, "getRoles").mockResolvedValue([mockRole]);

            const role = await command.getOrCreateRole(settings);

            expect(role).toEqual(mockRole);
        });

        it("should create a new DWC role if it doesn't exist", async () => {
            vi.spyOn(command.client.api.guilds, "getRoles").mockResolvedValue([]);
            const createSpy = vi.spyOn(command.client.api.guilds, "createRole").mockResolvedValue(mockRole);

            const role = await command.getOrCreateRole(settings);

            expect(role).toEqual(mockRole);
            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith(settings.guildID, {
                color: expect.any(Number),
                hoist: true,
                name: "Deal With Caution"
            });
        });

        it("should update the settings with the new role ID", async () => {
            vi.spyOn(command.client.api.guilds, "createRole").mockResolvedValue(mockRole);
            vi.spyOn(command.client.api.guilds, "getRoles").mockResolvedValue([]);
            const upsertSpy = vi.spyOn(command.module.moderationSettings, "upsert");

            await command.getOrCreateRole(settings);

            expect(upsertSpy).toHaveBeenCalledOnce();
            expect(upsertSpy).toHaveBeenCalledWith(settings.guildID, {
                dwcRoleID: mockRole.id
            });
        });

        it("should update the permissions of the profiles channel", async () => {
            vi.spyOn(command.client.api.guilds, "createRole").mockResolvedValue(mockRole);
            vi.spyOn(command.client.api.guilds, "getRoles").mockResolvedValue([]);
            const updateSpy = vi.spyOn(command.client.api.channels, "editPermissionOverwrite");

            await command.getOrCreateRole(settings, profilesSettings);

            expect(updateSpy).toHaveBeenCalledOnce();
            expect(updateSpy).toHaveBeenCalledWith(profilesSettings.channelID, mockRole.id, {
                deny: "1024",
                type: OverwriteType.Role
            });
        });

        it("should not update the permissions of the profiles channel if the profiles module is not found", async () => {
            vi.spyOn(command.client.api.guilds, "createRole").mockResolvedValue(mockRole);
            vi.spyOn(command.client.api.guilds, "getRoles").mockResolvedValue([]);
            const updateSpy = vi.spyOn(command.client.api.channels, "editPermissionOverwrite");

            await command.getOrCreateRole(settings);

            expect(updateSpy).not.toHaveBeenCalled();
        });

        it("should not update the permissions of the profiles channel if the channel is not configured", async () => {
            vi.spyOn(command.client.api.guilds, "createRole").mockResolvedValue(mockRole);
            vi.spyOn(command.client.api.guilds, "getRoles").mockResolvedValue([]);
            const updateSpy = vi.spyOn(command.client.api.channels, "editPermissionOverwrite");
            profilesSettings.channelID = null;

            await command.getOrCreateRole(settings, profilesSettings);

            expect(updateSpy).not.toHaveBeenCalled();
        });

        it("should update the permissions of the requests channel", async () => {
            vi.spyOn(command.client.api.guilds, "createRole").mockResolvedValue(mockRole);
            vi.spyOn(command.client.api.guilds, "getRoles").mockResolvedValue([]);
            const updateSpy = vi.spyOn(command.client.api.channels, "editPermissionOverwrite");

            await command.getOrCreateRole(settings, undefined, requestsSettings);

            expect(updateSpy).toHaveBeenCalledOnce();
            expect(updateSpy).toHaveBeenCalledWith(requestsSettings.channelID, mockRole.id, {
                deny: "1024",
                type: OverwriteType.Role
            });
        });

        it("should not update the permissions of the requests channel if the requests module is not found", async () => {
            vi.spyOn(command.client.api.guilds, "createRole").mockResolvedValue(mockRole);
            vi.spyOn(command.client.api.guilds, "getRoles").mockResolvedValue([]);
            const updateSpy = vi.spyOn(command.client.api.channels, "editPermissionOverwrite");

            await command.getOrCreateRole(settings);

            expect(updateSpy).not.toHaveBeenCalled();
        });

        it("should not update the permissions of the requests channel if the channel is not configured", async () => {
            vi.spyOn(command.client.api.guilds, "createRole").mockResolvedValue(mockRole);
            vi.spyOn(command.client.api.guilds, "getRoles").mockResolvedValue([]);
            const updateSpy = vi.spyOn(command.client.api.channels, "editPermissionOverwrite");
            requestsSettings.channelID = null;

            await command.getOrCreateRole(settings, undefined, requestsSettings);

            expect(updateSpy).not.toHaveBeenCalled();
        });

        it("should log an error if the bot couldn't create the DWC role", async () => {
            const error = new Error("Oh no!");
            vi.spyOn(command.client.api.guilds, "createRole").mockRejectedValue(error);
            vi.spyOn(command.client.api.guilds, "getRoles").mockResolvedValue([]);

            await command.getOrCreateRole(settings, profilesSettings, requestsSettings);

            expect(command.client.logger.error).toHaveBeenCalledOnce();
            expect(command.client.logger.error).toHaveBeenCalledWith(error);
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

            expect(result).toEqual(COMMON_DWC_REASONS.map((x) => ({ name: x, value: x })));
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
                COMMON_DWC_REASONS[0].slice(0, 5) as never,
                interaction
            );

            expect(result).toEqual([{
                name: COMMON_DWC_REASONS[0],
                value: COMMON_DWC_REASONS[0]
            }]);
        });
    });
});
