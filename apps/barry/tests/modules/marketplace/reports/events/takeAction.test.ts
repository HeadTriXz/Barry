import { type DeepMockProxy, mockDeep } from "vitest-mock-extended";
import {
    type ReportsSettings,
    ReportCategory,
    ReportStatus,
    ReportType
} from "@prisma/client";
import type { BaseModerationModule } from "../../../../../src/types/moderation.js";
import type { LocalReportWithReport } from "../../../../../dist/modules/marketplace/dependencies/reports/database/LocalReportRepository.js";
import type { Mock } from "vitest";

import {
    ComponentType,
    InteractionType,
    MessageFlags
} from "@discordjs/core";
import {
    MessageComponentInteraction,
    ModalSubmitInteraction,
    Module
} from "@barry-bot/core";
import {
    createMockMessageComponentInteraction,
    createMockModalSubmitInteraction,
    mockChannel,
    mockGuild,
    mockMember,
    mockUser
} from "@barry-bot/testing";
import { REPORT_BASE_ACTIONS, REPORT_GLOBAL_ACTIONS, REPORT_LOCAL_ACTIONS, ReportAction } from "../../../../../src/modules/marketplace/dependencies/reports/constants.js";
import { createMockApplication } from "../../../../mocks/index.js";
import { timeoutContent } from "../../../../../src/common.js";

import ReportsModule, { ReportActionButton } from "../../../../../src/modules/marketplace/dependencies/reports/index.js";
import TakeActionEvent from "../../../../../src/modules/marketplace/dependencies/reports/events/takeAction.js";

describe("Take Action Event (InteractionCreate)", () => {
    let event: TakeActionEvent;
    let interaction: MessageComponentInteraction;
    let localReport: LocalReportWithReport;
    let modModule: DeepMockProxy<BaseModerationModule>;
    let response: MessageComponentInteraction;
    let settings: ReportsSettings;
    let values: string[];

    beforeEach(() => {
        const client = createMockApplication();
        const module = new ReportsModule(client);
        event = new TakeActionEvent(module);

        modModule = mockDeep<BaseModerationModule>();

        const data = createMockMessageComponentInteraction({
            component_type: ComponentType.Button,
            custom_id: ReportActionButton.Action
        });
        interaction = new MessageComponentInteraction(data, client, vi.fn());
        interaction.createMessage = vi.fn();
        interaction.editParent = vi.fn();

        values = [];
        const responseData = createMockMessageComponentInteraction({
            component_type: ComponentType.StringSelect,
            custom_id: "select_action",
            values: values
        });
        response = new MessageComponentInteraction(responseData, client, vi.fn());
        response.createMessage = vi.fn();
        response.editParent = vi.fn();

        localReport = {
            createdAt: new Date(),
            guildID: mockGuild.id,
            id: 1,
            report: {
                category: ReportCategory.FalseInformation,
                createdAt: new Date(),
                creatorID: mockUser.id,
                guildID: mockGuild.id,
                id: 1,
                reason: "Oh no!",
                requestID: 1,
                type: ReportType.Request,
                userID: "257522665437265920"
            },
            reportID: 1,
            status: ReportStatus.Open,
            threadID: mockChannel.id
        };
        settings = {
            channelID: mockChannel.id,
            guildID: mockGuild.id,
            tagAccepted: null,
            tagCopyright: null,
            tagFalseInformation: null,
            tagIgnored: null,
            tagInappropriate: null,
            tagOpen: null,
            tagOther: null,
            tagScamsFraud: null
        };

        vi.spyOn(client.api.channels, "edit").mockResolvedValue({ ...mockChannel, position: 1 });
        vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
        vi.spyOn(module, "getTagFromCategory").mockReturnValue("116051392457550900");
        vi.spyOn(module.localReports, "getByThread").mockResolvedValue(localReport);
        vi.spyOn(module.settings, "getOrCreate").mockResolvedValue(settings);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
    });

    describe("execute", () => {
        describe("Validation", () => {
            it("should ignore if the interaction is not invoked in a guild", async () => {
                delete interaction.guildID;

                await event.execute(interaction);

                expect(interaction.acknowledged).toBe(false);
            });

            it("should ignore if the interaction is not of type 'MessageComponent'", async () => {
                interaction.type = InteractionType.ApplicationCommand as InteractionType.MessageComponent;

                await event.execute(interaction);

                expect(interaction.acknowledged).toBe(false);
            });

            it("should ignore if the interaction is not a button", async () => {
                interaction.data.componentType = ComponentType.StringSelect;

                await event.execute(interaction);

                expect(interaction.acknowledged).toBe(false);
            });

            it("should ignore if the interaction is not a report button", async () => {
                interaction.data.customID = "test";

                await event.execute(interaction);

                expect(interaction.acknowledged).toBe(false);
            });
        });

        describe("Error Handling", () => {
            it("should show an error message if the report is not found", async () => {
                vi.spyOn(event.module.localReports, "getByThread").mockResolvedValue(null);

                await event.execute(interaction);

                expect(interaction.createMessage).toHaveBeenCalledOnce();
                expect(interaction.createMessage).toHaveBeenCalledWith({
                    content: expect.stringContaining("Failed to find the report you're looking for."),
                    flags: MessageFlags.Ephemeral
                });
            });

            it("should show a timeout message if the user did not respond in time", async () => {
                vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

                await event.execute(interaction);

                expect(interaction.editParent).toHaveBeenCalledOnce();
                expect(interaction.editParent).toHaveBeenCalledWith(timeoutContent);
            });
        });

        describe("Action Handling", () => {
            it("should show a select menu with global actions if the guild is a moderator guild", async () => {
                vi.stubEnv("MODERATOR_GUILDS", mockGuild.id);

                await event.execute(interaction);

                expect(interaction.createMessage).toHaveBeenCalledOnce();
                expect(interaction.createMessage).toHaveBeenCalledWith({
                    components: [{
                        components: [
                            expect.objectContaining({
                                options: REPORT_GLOBAL_ACTIONS
                            })
                        ],
                        type: ComponentType.ActionRow
                    }],
                    content: expect.stringContaining("Please select an action to take on this report."),
                    flags: MessageFlags.Ephemeral
                });
            });

            it("should show a select menu with local actions if the guild is not a moderator guild", async () => {
                modModule.isEnabled.mockResolvedValue(true);

                vi.spyOn(event.client.modules, "get").mockReturnValue(modModule);
                vi.stubEnv("MODERATOR_GUILDS", "");

                await event.execute(interaction);

                expect(interaction.createMessage).toHaveBeenCalledOnce();
                expect(interaction.createMessage).toHaveBeenCalledWith({
                    components: [{
                        components: [
                            expect.objectContaining({
                                options: REPORT_LOCAL_ACTIONS
                            })
                        ],
                        type: ComponentType.ActionRow
                    }],
                    content: expect.stringContaining("Please select an action to take on this report."),
                    flags: MessageFlags.Ephemeral
                });
            });

            it("should show a select menu with base actions if the moderation module is not enabled", async () => {
                vi.stubEnv("MODERATOR_GUILDS", "");

                await event.execute(interaction);

                expect(interaction.createMessage).toHaveBeenCalledOnce();
                expect(interaction.createMessage).toHaveBeenCalledWith({
                    components: [{
                        components: [
                            expect.objectContaining({
                                options: REPORT_BASE_ACTIONS
                            })
                        ],
                        type: ComponentType.ActionRow
                    }],
                    content: expect.stringContaining("Please select an action to take on this report."),
                    flags: MessageFlags.Ephemeral
                });
            });

            it("should blacklist the user if the action is 'Blacklist'", async () => {
                const blacklistSpy = vi.spyOn(event, "handleBlacklist");
                values.push(ReportAction.Blacklist);

                await event.execute(interaction);

                expect(blacklistSpy).toHaveBeenCalledOnce();
                expect(blacklistSpy).toHaveBeenCalledWith(response, localReport, ReportAction.Blacklist);
            });

            it("should blacklist the reporter if the action is 'Blacklist Reporter'", async () => {
                const blacklistSpy = vi.spyOn(event, "handleBlacklist");
                values.push(ReportAction.BlacklistReporter);

                await event.execute(interaction);

                expect(blacklistSpy).toHaveBeenCalledOnce();
                expect(blacklistSpy).toHaveBeenCalledWith(response, localReport, ReportAction.BlacklistReporter);
            });

            it("should ban the user if the action is 'Ban'", async () => {
                const banSpy = vi.spyOn(event, "handleModerationAction");
                values.push(ReportAction.Ban);

                await event.execute(interaction);

                expect(banSpy).toHaveBeenCalledOnce();
                expect(banSpy).toHaveBeenCalledWith(response, localReport, ReportAction.Ban);
            });

            it("should mark the user as dwc if the action is 'DWC'", async () => {
                const dwcSpy = vi.spyOn(event, "handleModerationAction");
                values.push(ReportAction.DWC);

                await event.execute(interaction);

                expect(dwcSpy).toHaveBeenCalledOnce();
                expect(dwcSpy).toHaveBeenCalledWith(response, localReport, ReportAction.DWC);
            });

            it("should kick the user if the action is 'Kick'", async () => {
                const kickSpy = vi.spyOn(event, "handleModerationAction");
                values.push(ReportAction.Kick);

                await event.execute(interaction);

                expect(kickSpy).toHaveBeenCalledOnce();
                expect(kickSpy).toHaveBeenCalledWith(response, localReport, ReportAction.Kick);
            });

            it("should warn the user if the action is 'Warn'", async () => {
                const warnSpy = vi.spyOn(event, "handleModerationAction");
                values.push(ReportAction.Warn);

                await event.execute(interaction);

                expect(warnSpy).toHaveBeenCalledOnce();
                expect(warnSpy).toHaveBeenCalledWith(response, localReport, ReportAction.Warn);
            });

            it("should warn the reporter if the action is 'Warn Reporter'", async () => {
                const warnSpy = vi.spyOn(event, "handleModerationAction");
                values.push(ReportAction.WarnReporter);

                await event.execute(interaction);

                expect(warnSpy).toHaveBeenCalledOnce();
                expect(warnSpy).toHaveBeenCalledWith(response, localReport, ReportAction.WarnReporter);
            });

            it("should mute the user if the action is 'Mute'", async () => {
                const muteSpy = vi.spyOn(event, "handleMute");
                values.push(ReportAction.Mute);

                await event.execute(interaction);

                expect(muteSpy).toHaveBeenCalledOnce();
                expect(muteSpy).toHaveBeenCalledWith(response, localReport);
            });

            it("should mark the report as 'Accepted' if the action is 'None'", async () => {
                const updateSpy = vi.spyOn(event.module.localReports, "update");
                values.push(ReportAction.None);

                await event.execute(interaction);

                expect(updateSpy).toHaveBeenCalledOnce();
                expect(updateSpy).toHaveBeenCalledWith(localReport.guildID, localReport.id, {
                    status: ReportStatus.Accepted
                });
            });

            it("should mark the report as 'Ignored' if the action is 'Ignore'", async () => {
                const updateSpy = vi.spyOn(event.module.localReports, "update");
                values.push(ReportAction.Ignore);

                await event.execute(interaction);

                expect(updateSpy).toHaveBeenCalledOnce();
                expect(updateSpy).toHaveBeenCalledWith(localReport.guildID, localReport.id, {
                    status: ReportStatus.Ignored
                });
            });
        });
    });

    describe("handleBlacklist", () => {
        let blacklist: Mock<any, any>;
        let isBlacklisted: Mock<any, any>;

        beforeEach(() => {
            blacklist = vi.fn().mockResolvedValue(undefined);
            isBlacklisted = vi.fn().mockResolvedValue(false);

            vi.spyOn(event.client.modules, "get").mockReturnValue({
                blacklistedUsers: {
                    blacklist,
                    isBlacklisted
                }
            } as unknown as Module);
        });

        it("should update the report's status", async () => {
            const updateSpy = vi.spyOn(event.module.localReports, "update");
            await event.handleBlacklist(response, localReport, ReportAction.Blacklist);

            expect(updateSpy).toHaveBeenCalledOnce();
            expect(updateSpy).toHaveBeenCalledWith(localReport.guildID, localReport.id, {
                status: ReportStatus.Accepted
            });
        });

        it("should blacklist the user if the action is 'Blacklist'", async () => {
            await event.handleBlacklist(response, localReport, ReportAction.Blacklist);

            expect(blacklist).toHaveBeenCalledOnce();
            expect(blacklist).toHaveBeenCalledWith(localReport.report.userID);
        });

        it("should blacklist the reporter if the action is 'Blacklist Reporter'", async () => {
            await event.handleBlacklist(response, localReport, ReportAction.BlacklistReporter);

            expect(blacklist).toHaveBeenCalledOnce();
            expect(blacklist).toHaveBeenCalledWith(localReport.report.creatorID);
        });

        it("should show a success message", async () => {
            await event.handleBlacklist(response, localReport, ReportAction.Blacklist);

            expect(response.editParent).toHaveBeenCalledOnce();
            expect(response.editParent).toHaveBeenCalledWith({
                components: [],
                content: expect.stringContaining("Successfully blacklisted")
            });
        });

        it("should ignore if the interaction was not invoked in a guild", async () => {
            delete response.guildID;

            await event.handleBlacklist(response, localReport, ReportAction.Blacklist);

            expect(response.acknowledged).toBe(false);
        });

        it("should ignore if the developers module does not exist", async () => {
            vi.spyOn(event.client.modules, "get").mockReturnValue(undefined);

            await event.handleBlacklist(response, localReport, ReportAction.Blacklist);

            expect(response.acknowledged).toBe(false);
        });

        it("should show an error message if the user is already blacklisted", async () => {
            isBlacklisted.mockResolvedValue(true);

            await event.handleBlacklist(response, localReport, ReportAction.Blacklist);

            expect(response.editParent).toHaveBeenCalledOnce();
            expect(response.editParent).toHaveBeenCalledWith({
                components: [],
                content: expect.stringContaining("The user is already blacklisted.")
            });
        });
    });

    describe("handleModerationAction", () => {
        let submit: ModalSubmitInteraction;

        beforeEach(() => {
            vi.spyOn(event.client.modules, "get").mockReturnValue(modModule);
            vi.spyOn(event.client.api.guilds, "getMember").mockResolvedValue(mockMember);
            vi.spyOn(event.client.api.users, "get").mockResolvedValue(mockUser);

            const submitData = createMockModalSubmitInteraction({
                components: [{
                    components: [{
                        custom_id: "reason",
                        type: ComponentType.TextInput,
                        value: "Oh no!"
                    }],
                    type: ComponentType.ActionRow
                }],
                custom_id: expect.stringContaining("-reason")
            });
            submit = new ModalSubmitInteraction(submitData, event.client, vi.fn());
            submit.editParent = vi.fn();

            vi.spyOn(response, "awaitModalSubmit").mockResolvedValue(submit);
        });

        it("should update the report's status", async () => {
            const updateSpy = vi.spyOn(event.module.localReports, "update");
            await event.handleModerationAction(response, localReport, ReportAction.Ban);

            expect(updateSpy).toHaveBeenCalledOnce();
            expect(updateSpy).toHaveBeenCalledWith(localReport.guildID, localReport.id, {
                status: ReportStatus.Accepted
            });
        });

        it("should add tags if they are configured", async () => {
            const editSpy = vi.spyOn(event.client.api.channels, "edit");
            settings.tagAccepted = "116051392457550900";

            await event.handleModerationAction(response, localReport, ReportAction.Ban);

            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith(localReport.threadID, {
                applied_tags: ["116051392457550900", "116051392457550900"],
                archived: true
            });
        });

        it("should not add tags if they are not configured", async () => {
            const editSpy = vi.spyOn(event.client.api.channels, "edit");
            vi.mocked(event.module.getTagFromCategory).mockReturnValue(null);
            settings.tagAccepted = null;

            await event.handleModerationAction(response, localReport, ReportAction.Ban);

            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith(localReport.threadID, {
                applied_tags: [],
                archived: true
            });
        });

        it("should ignore if the interaction was not invoked in a guild", async () => {
            delete response.guildID;

            await event.handleModerationAction(response, localReport, ReportAction.Ban);

            expect(response.acknowledged).toBe(false);
        });

        it("should ignore if the moderation module does not exist", async () => {
            vi.spyOn(event.client.modules, "get").mockReturnValue(undefined);

            await event.handleModerationAction(response, localReport, ReportAction.Ban);

            expect(response.acknowledged).toBe(false);
        });

        it("should fetch the user if the member is undefined", async () => {
            const error = new Error("Oh no!");
            vi.spyOn(event.client.api.guilds, "getMember").mockRejectedValue(error);

            await event.handleModerationAction(response, localReport, ReportAction.Ban);

            expect(event.client.api.users.get).toHaveBeenCalledOnce();
            expect(event.client.api.users.get).toHaveBeenCalledWith(localReport.report.userID);
        });

        it("should show a timeout message if the user did not respond in time", async () => {
            vi.spyOn(response, "awaitModalSubmit").mockResolvedValue(undefined);

            await event.handleModerationAction(response, localReport, ReportAction.Ban);

            expect(response.editParent).toHaveBeenCalledOnce();
            expect(response.editParent).toHaveBeenCalledWith(timeoutContent);
        });

        describe("Ban", () => {
            it("should ban the user", async () => {
                await event.handleModerationAction(response, localReport, ReportAction.Ban);

                expect(modModule.actions.ban).toHaveBeenCalledOnce();
                expect(modModule.actions.ban).toHaveBeenCalledWith(submit, {
                    member: mockMember,
                    reason: "Oh no!",
                    user: mockUser
                });
            });
        });

        describe("DWC", () => {
            it("should mark the user as dwc", async () => {
                await event.handleModerationAction(response, localReport, ReportAction.DWC);

                expect(modModule.actions.dwc).toHaveBeenCalledOnce();
                expect(modModule.actions.dwc).toHaveBeenCalledWith(submit, {
                    member: mockMember,
                    reason: "Oh no!",
                    user: mockUser
                });
            });
        });

        describe("Kick", () => {
            it("should kick the user", async () => {
                await event.handleModerationAction(response, localReport, ReportAction.Kick);

                expect(modModule.actions.kick).toHaveBeenCalledOnce();
                expect(modModule.actions.kick).toHaveBeenCalledWith(submit, {
                    member: mockMember,
                    reason: "Oh no!"
                });
            });

            it("should show an error message if the user is not in the guild", async () => {
                const error = new Error("Oh no!");
                vi.spyOn(event.client.api.guilds, "getMember").mockRejectedValue(error);

                await event.handleModerationAction(response, localReport, ReportAction.Kick);

                expect(submit.editParent).toHaveBeenCalledOnce();
                expect(submit.editParent).toHaveBeenCalledWith({
                    components: [],
                    content: expect.stringContaining("Failed to find the user to kick.")
                });
            });
        });

        describe("Warn", () => {
            it("should warn the user", async () => {
                await event.handleModerationAction(response, localReport, ReportAction.Warn);

                expect(modModule.actions.warn).toHaveBeenCalledOnce();
                expect(modModule.actions.warn).toHaveBeenCalledWith(submit, {
                    member: mockMember,
                    reason: "Oh no!"
                });
            });

            it("should show an error message if the user is not in the guild", async () => {
                const error = new Error("Oh no!");
                vi.spyOn(event.client.api.guilds, "getMember").mockRejectedValue(error);

                await event.handleModerationAction(response, localReport, ReportAction.Warn);

                expect(submit.editParent).toHaveBeenCalledOnce();
                expect(submit.editParent).toHaveBeenCalledWith({
                    components: [],
                    content: expect.stringContaining("Failed to find the user to warn.")
                });
            });
        });

        describe("Warn Reporter", () => {
            it("should warn the reporter", async () => {
                await event.handleModerationAction(response, localReport, ReportAction.WarnReporter);

                expect(modModule.actions.warn).toHaveBeenCalledOnce();
                expect(modModule.actions.warn).toHaveBeenCalledWith(submit, {
                    member: mockMember,
                    reason: "Oh no!"
                });
            });

            it("should show an error message if the reporter is not in the guild", async () => {
                const error = new Error("Oh no!");
                vi.spyOn(event.client.api.guilds, "getMember").mockRejectedValue(error);

                await event.handleModerationAction(response, localReport, ReportAction.WarnReporter);

                expect(submit.editParent).toHaveBeenCalledOnce();
                expect(submit.editParent).toHaveBeenCalledWith({
                    components: [],
                    content: expect.stringContaining("Failed to find the user to warn.")
                });
            });
        });
    });

    describe("handleMute", () => {
        let submit: ModalSubmitInteraction;

        beforeEach(() => {
            modModule = mockDeep<BaseModerationModule>();
            vi.spyOn(event.client.modules, "get").mockReturnValue(modModule);
            vi.spyOn(event.client.api.guilds, "getMember").mockResolvedValue(mockMember);

            const submitData = createMockModalSubmitInteraction({
                components: [
                    {
                        components: [{
                            custom_id: "reason",
                            type: ComponentType.TextInput,
                            value: "Oh no!"
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "duration",
                            type: ComponentType.TextInput,
                            value: "1d"
                        }],
                        type: ComponentType.ActionRow
                    }
                ],
                custom_id: expect.stringContaining("-mute-reason")
            });
            submit = new ModalSubmitInteraction(submitData, event.client, vi.fn());
            submit.editParent = vi.fn();

            vi.spyOn(response, "awaitModalSubmit").mockResolvedValue(submit);
        });

        it("should mute the user", async () => {
            await event.handleMute(response, localReport);

            expect(modModule.actions.mute).toHaveBeenCalledOnce();
            expect(modModule.actions.mute).toHaveBeenCalledWith(submit, {
                duration: "1d",
                member: mockMember,
                reason: "Oh no!"
            });
        });

        it("should update the report's status", async () => {
            const updateSpy = vi.spyOn(event.module.localReports, "update");
            await event.handleMute(response, localReport);

            expect(updateSpy).toHaveBeenCalledOnce();
            expect(updateSpy).toHaveBeenCalledWith(localReport.guildID, localReport.id, {
                status: ReportStatus.Accepted
            });
        });

        it("should ignore if the interaction was not invoked in a guild", async () => {
            delete response.guildID;

            await event.handleMute(response, localReport);

            expect(response.acknowledged).toBe(false);
        });

        it("should ignore if the moderation module does not exist", async () => {
            vi.spyOn(event.client.modules, "get").mockReturnValue(undefined);

            await event.handleMute(response, localReport);

            expect(response.acknowledged).toBe(false);
        });

        it("should show an error message if the member is undefined", async () => {
            const error = new Error("Oh no!");
            vi.spyOn(event.client.api.guilds, "getMember").mockRejectedValue(error);

            await event.handleMute(response, localReport);

            expect(response.editParent).toHaveBeenCalledOnce();
            expect(response.editParent).toHaveBeenCalledWith({
                components: [],
                content: expect.stringContaining("Failed to find the user to mute.")
            });
        });

        it("should show a timeout message if the user did not respond in time", async () => {
            vi.spyOn(response, "awaitModalSubmit").mockResolvedValue(undefined);

            await event.handleMute(response, localReport);

            expect(response.editParent).toHaveBeenCalledOnce();
            expect(response.editParent).toHaveBeenCalledWith(timeoutContent);
        });
    });
});
