import { type DeepMockProxy, mockDeep } from "vitest-mock-extended";
import type { LocalReportWithReport } from "../../../../../src/modules/marketplace/dependencies/reports/database/LocalReportRepository.js";

import {
    ComponentType,
    InteractionType,
    MessageFlags
} from "@discordjs/core";
import {
    ReportCategory,
    ReportStatus,
    ReportType
} from "@prisma/client";
import {
    createMockMessageComponentInteraction,
    mockChannel,
    mockGuild,
    mockUser
} from "@barry/testing";

import { MessageComponentInteraction } from "@barry/core";
import { createMockApplication } from "../../../../mocks/application.js";

import ViewOriginEvent, { type ModuleWithContent } from "../../../../../src/modules/marketplace/dependencies/reports/events/viewOrigin.js";
import ReportsModule, { ReportActionButton } from "../../../../../src/modules/marketplace/dependencies/reports/index.js";

describe("View Origin Event (InteractionCreate)", () => {
    let event: ViewOriginEvent;
    let interaction: MessageComponentInteraction;
    let localReport: LocalReportWithReport;

    let contentModule: DeepMockProxy<ModuleWithContent>;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new ReportsModule(client);
        event = new ViewOriginEvent(module);

        contentModule = mockDeep<ModuleWithContent>();
        contentModule.getContent.mockResolvedValue({
            content: "Hello World"
        });

        const data = createMockMessageComponentInteraction({
            component_type: ComponentType.Button,
            custom_id: ReportActionButton.View
        });
        interaction = new MessageComponentInteraction(data, client, vi.fn());
        interaction.createMessage = vi.fn();

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

        vi.spyOn(client.modules, "get").mockReturnValue(contentModule);
        vi.spyOn(module.localReports, "getByThread").mockResolvedValue(localReport);
    });

    describe("execute", () => {
        it("should show the content of the profile if the report is a profile", async () => {
            await event.execute(interaction);

            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                content: "Hello World",
                flags: MessageFlags.Ephemeral
            });
        });

        it("should show the content of the request if the report is a request", async () => {
            localReport.report.requestID = null;

            await event.execute(interaction);

            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                content: "Hello World",
                flags: MessageFlags.Ephemeral
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

            it("should show an error message if the report's content is not found", async () => {
                vi.spyOn(event.client.modules, "get").mockReturnValue(undefined);

                await event.execute(interaction);

                expect(interaction.createMessage).toHaveBeenCalledOnce();
                expect(interaction.createMessage).toHaveBeenCalledWith({
                    content: expect.stringContaining("Failed to find the report you're looking for."),
                    flags: MessageFlags.Ephemeral
                });
            });
        });
    });
});
