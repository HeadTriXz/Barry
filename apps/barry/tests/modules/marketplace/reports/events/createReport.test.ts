import { type DeepMockProxy, mockDeep } from "vitest-mock-extended";
import {
    type Report,
    type ReportsSettings,
    ReportCategory,
    ReportStatus,
    ReportType
} from "@prisma/client";

import {
    ChannelType,
    ComponentType,
    InteractionType,
    MessageFlags
} from "@discordjs/core";
import {
    MessageComponentInteraction,
    MessageStringSelectInteractionData,
    ModalSubmitInteraction
} from "@barry/core";
import {
    REPORT_CATEGORY_TITLE,
    REPORT_DEFAULT_PROFILE_REASONS,
    REPORT_DEFAULT_REQUEST_REASONS
} from "../../../../../src/modules/marketplace/dependencies/reports/constants.js";
import {
    createMockMessageComponentInteraction,
    createMockModalSubmitInteraction,
    mockChannel,
    mockGuild,
    mockUser
} from "@barry/testing";

import { DiscordAPIError } from "@discordjs/rest";
import { ProfileActionButton } from "../../../../../src/modules/marketplace/dependencies/profiles/index.js";
import { RequestActionButton } from "../../../../../src/modules/marketplace/dependencies/requests/index.js";
import { createMockApplication } from "../../../../mocks/application.js";
import { timeoutContent } from "../../../../../src/common.js";

import CreateReportEvent, { type ModuleWithData } from "../../../../../src/modules/marketplace/dependencies/reports/events/createReport.js";
import ReportsModule from "../../../../../src/modules/marketplace/dependencies/reports/index.js";

describe("CreateReport Event (InteractionCreate)", () => {
    const userID = "257522665437265920";

    let event: CreateReportEvent;
    let interaction: MessageComponentInteraction;
    let response: MessageComponentInteraction;

    let report: Report;
    let settings: ReportsSettings;

    let profilesModule: DeepMockProxy<ModuleWithData<"profiles">>;
    let requestsModule: DeepMockProxy<ModuleWithData<"requests">>;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new ReportsModule(client);
        event = new CreateReportEvent(module);

        profilesModule = mockDeep<ModuleWithData<"profiles">>();
        requestsModule = mockDeep<ModuleWithData<"requests">>();

        profilesModule.profiles.getByMessage.mockResolvedValue({ userID });
        requestsModule.requests.getByMessage.mockResolvedValue({
            id: 1,
            userID: userID
        });

        const data = createMockMessageComponentInteraction({
            component_type: ComponentType.Button,
            custom_id: RequestActionButton.Report
        });
        interaction = new MessageComponentInteraction(data, client, vi.fn());
        interaction.createMessage = vi.fn();
        interaction.editParent = vi.fn();

        const responseData = createMockMessageComponentInteraction({
            component_type: ComponentType.StringSelect,
            custom_id: "report_reason_select",
            values: [REPORT_DEFAULT_REQUEST_REASONS[ReportCategory.FalseInformation][0]]
        });
        response = new MessageComponentInteraction(responseData, client, vi.fn());
        response.createModal = vi.fn();
        response.editParent = vi.fn();

        report = {
            category: ReportCategory.FalseInformation,
            createdAt: new Date(),
            creatorID: mockUser.id,
            guildID: mockGuild.id,
            id: 1,
            reason: REPORT_DEFAULT_REQUEST_REASONS[ReportCategory.FalseInformation][0],
            requestID: 1,
            type: ReportType.Request,
            userID: userID
        };
        settings = {
            channelID: mockChannel.id,
            guildID: mockGuild.id,
            tagAccepted: "490893428905138230",
            tagCopyright: "490893428905138230",
            tagFalseInformation: "490893428905138230",
            tagIgnored: "490893428905138230",
            tagInappropriate: "490893428905138230",
            tagOpen: "490893428905138230",
            tagOther: "490893428905138230",
            tagScamsFraud: "490893428905138230"
        };

        vi.spyOn(client.api.channels, "createForumThread").mockResolvedValue({
            ...mockChannel,
            applied_tags: [],
            position: 1,
            type: ChannelType.PublicThread
        });
        vi.spyOn(client.api.users, "get").mockResolvedValue({ ...mockUser, id: userID });
        vi.spyOn(client.modules, "get").mockImplementation((id: string) => {
            switch (id) {
                case "marketplace.profiles":
                    return profilesModule;
                case "marketplace.requests":
                    return requestsModule;
            }
        });
        vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
        vi.spyOn(module.localReports, "getAccepted").mockResolvedValue([]);
        vi.spyOn(module.localReports, "getByCreator").mockResolvedValue(null);
        vi.spyOn(module.localReports, "nextInSequence").mockResolvedValue(1);
        vi.spyOn(module.reports, "create").mockResolvedValue(report);
        vi.spyOn(module.settings, "getOrCreate").mockResolvedValue(settings);

        vi.stubEnv("MODERATOR_GUILDS", "490893428905138230");
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
    });

    describe("execute", () => {
        describe("Reason Selection", () => {
            it("should show a list of pre-defined reasons to report a request", async () => {
                interaction.data.customID = RequestActionButton.Report;

                await event.execute(interaction);

                expect(interaction.createMessage).toHaveBeenCalledOnce();
                expect(interaction.createMessage).toHaveBeenCalledWith({
                    components: [{
                        components: [
                            expect.objectContaining({
                                options: expect.arrayContaining([{
                                    description: REPORT_CATEGORY_TITLE[ReportCategory.FalseInformation],
                                    label: REPORT_DEFAULT_REQUEST_REASONS[ReportCategory.FalseInformation][0],
                                    value: REPORT_DEFAULT_REQUEST_REASONS[ReportCategory.FalseInformation][0]
                                }])
                            })
                        ],
                        type: ComponentType.ActionRow
                    }],
                    content: expect.stringContaining("Please select a reason for this report."),
                    flags: MessageFlags.Ephemeral
                });
            });

            it("should show a list of pre-defined reasons to report a profile", async () => {
                interaction.data.customID = ProfileActionButton.Report;

                await event.execute(interaction);

                expect(interaction.createMessage).toHaveBeenCalledOnce();
                expect(interaction.createMessage).toHaveBeenCalledWith({
                    components: [{
                        components: [
                            expect.objectContaining({
                                options: expect.arrayContaining([{
                                    description: REPORT_CATEGORY_TITLE[ReportCategory.FalseInformation],
                                    label: REPORT_DEFAULT_PROFILE_REASONS[ReportCategory.FalseInformation][0],
                                    value: REPORT_DEFAULT_PROFILE_REASONS[ReportCategory.FalseInformation][0]
                                }])
                            })
                        ],
                        type: ComponentType.ActionRow
                    }],
                    content: expect.stringContaining("Please select a reason for this report."),
                    flags: MessageFlags.Ephemeral
                });
            });

            it("should allow the user to specify a custom reason", async () => {
                interaction.data.customID = RequestActionButton.Report;
                (response.data as MessageStringSelectInteractionData).values = [ReportCategory.Other];
                const submitData = createMockModalSubmitInteraction({
                    components: [{
                        components: [{
                            custom_id: "reason",
                            type: ComponentType.TextInput,
                            value: "test"
                        }],
                        type: ComponentType.ActionRow
                    }],
                    custom_id: expect.stringContaining("-report-reason")
                });
                const submit = new ModalSubmitInteraction(submitData, event.client, vi.fn());
                vi.spyOn(response, "awaitModalSubmit").mockResolvedValue(submit);

                await event.execute(interaction);

                expect(response.createModal).toHaveBeenCalledOnce();
                expect(event.module.reports.create).toHaveBeenCalledOnce();
                expect(event.module.reports.create).toHaveBeenCalledWith(expect.objectContaining({
                    reason: "test"
                }));
            });
        });

        describe("Report Creation", () => {
            it("should create a report for a request", async () => {
                await event.execute(interaction);

                expect(event.module.reports.create).toHaveBeenCalledOnce();
                expect(event.module.reports.create).toHaveBeenCalledWith(expect.objectContaining({
                    category: ReportCategory.FalseInformation,
                    creatorID: mockUser.id,
                    guildID: mockGuild.id,
                    reason: REPORT_DEFAULT_REQUEST_REASONS[ReportCategory.FalseInformation][0],
                    requestID: 1,
                    type: ReportType.Request,
                    userID: userID
                }));
            });

            it("should create a local report for the guild", async () => {
                const createSpy = vi.spyOn(event.module.localReports, "create");
                delete process.env.MODERATOR_GUILDS;

                await event.execute(interaction);

                expect(createSpy).toHaveBeenCalledOnce();
                expect(createSpy).toHaveBeenCalledWith({
                    guildID: mockGuild.id,
                    id: 1,
                    reportID: 1,
                    threadID: mockChannel.id
                });
            });

            it("should create a local report for a global moderation server", async () => {
                const createSpy = vi.spyOn(event.module.localReports, "create");
                vi.stubEnv("MODERATOR_GUILDS", "490893428905138230,490893428905138231");

                await event.execute(interaction);

                expect(createSpy).toHaveBeenCalledTimes(3);
                expect(createSpy).toHaveBeenCalledWith({
                    guildID: "490893428905138231",
                    id: 1,
                    reportID: 1,
                    threadID: mockChannel.id
                });
            });

            it("should create a thread for the report", async () => {
                await event.execute(interaction);

                expect(event.client.api.channels.createForumThread).toHaveBeenCalledTimes(2);
                expect(event.client.api.channels.createForumThread).toHaveBeenCalledWith(mockChannel.id, {
                    applied_tags: ["490893428905138230", "490893428905138230"],
                    message: expect.any(Object),
                    name: `#1 - ${mockUser.username}`
                });
            });

            it("should show a success message", async () => {
                await event.execute(interaction);

                expect(response.editParent).toHaveBeenCalledOnce();
                expect(response.editParent).toHaveBeenCalledWith({
                    components: [],
                    content: expect.stringContaining("Your report has successfully been submitted.")
                });
            });
        });

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

            it("should show an error message if the user tries to report themselves", async () => {
                interaction.user = { ...mockUser, id: userID };

                await event.execute(interaction);

                expect(interaction.createMessage).toHaveBeenCalledOnce();
                expect(interaction.createMessage).toHaveBeenCalledWith({
                    content: expect.stringContaining("You cannot report yourself."),
                    flags: MessageFlags.Ephemeral
                });
            });

            it("should show an error message if the user has already reported the entity", async () => {
                vi.spyOn(event.module.localReports, "getByCreator").mockResolvedValue({
                    createdAt: new Date(),
                    guildID: mockGuild.id,
                    id: 1,
                    reportID: 1,
                    status: ReportStatus.Open,
                    threadID: mockChannel.id
                });

                await event.execute(interaction);

                expect(interaction.createMessage).toHaveBeenCalledOnce();
                expect(interaction.createMessage).toHaveBeenCalledWith({
                    content: expect.stringContaining("You have already reported this user."),
                    flags: MessageFlags.Ephemeral
                });
            });

            it("should show a timeout message if the user does not respond in time", async () => {
                vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

                await event.execute(interaction);

                expect(interaction.editParent).toHaveBeenCalledOnce();
                expect(interaction.editParent).toHaveBeenCalledWith(timeoutContent);
            });
        });

        describe("Error Handling", () => {
            it("should show an error message if the entity does not exist", async () => {
                profilesModule.profiles.getByMessage.mockResolvedValue(null);
                requestsModule.requests.getByMessage.mockResolvedValue(null);

                await event.execute(interaction);

                expect(interaction.createMessage).toHaveBeenCalledOnce();
                expect(interaction.createMessage).toHaveBeenCalledWith({
                    content: expect.stringContaining("Failed to find the user to report."),
                    flags: MessageFlags.Ephemeral
                });
            });

            it("should show a timeout message if the user does not respond in time while selecting a custom reason", async () => {
                (response.data as MessageStringSelectInteractionData).values = [ReportCategory.Other];
                vi.spyOn(response, "awaitModalSubmit").mockResolvedValue(undefined);

                await event.execute(interaction);

                expect(response.editParent).toHaveBeenCalledOnce();
                expect(response.editParent).toHaveBeenCalledWith(timeoutContent);
            });

            it("should remove 'channelID' from the settings if the channel does not exist", async () => {
                const upsertSpy = vi.spyOn(event.module.settings, "upsert");
                const rawError = {
                    code: 10003,
                    message: "Unknown channel"
                };
                const error = new DiscordAPIError(rawError, 10003, 404, "GET", "", {});
                vi.spyOn(event.client.api.channels, "createForumThread").mockRejectedValueOnce(error);

                await event.execute(interaction);

                expect(upsertSpy).toHaveBeenCalledOnce();
                expect(upsertSpy).toHaveBeenCalledWith(mockGuild.id, {
                    channelID: null
                });
            });
        });
    });
});
