import { type ReportsSettings, ReportCategory } from "@prisma/client";

import { ChannelType, OverwriteType, PermissionFlagsBits } from "@discordjs/core";
import { MessageComponentInteraction, UpdatableInteraction } from "@barry/core";
import {
    REPORT_CHANNEL_TAGS,
    REPORT_DEFAULT_PROFILE_REASONS,
    REPORT_DEFAULT_REQUEST_REASONS
} from "../../../../src/modules/marketplace/dependencies/reports/constants.js";
import { createMockMessageComponentInteraction, mockChannel } from "@barry/testing";

import { LocalReportRepository } from "../../../../src/modules/marketplace/dependencies/reports/database/LocalReportRepository.js";
import { REPORT_CHANNEL_GUIDELINES } from "../../../../src/modules/marketplace/dependencies/reports/content.js";
import { ReportRepository } from "../../../../src/modules/marketplace/dependencies/reports/database/ReportRepository.js";
import { ReportsSettingsRepository } from "../../../../src/modules/marketplace/dependencies/reports/database/ReportsSettingsRepository.js";
import { createMockApplication } from "../../../mocks/application.js";
import { timeoutContent } from "../../../../src/common.js";

import ReportsModule from "../../../../src/modules/marketplace/dependencies/reports/index.js";
import { ChannelGuildSettingOption } from "../../../../src/config/options/ChannelGuildSettingOption.js";

describe("ReportsModule", () => {
    let module: ReportsModule;

    beforeEach(() => {
        const client = createMockApplication();
        module = new ReportsModule(client);
    });

    describe("constructor", () => {
        it("should set up the repositories correctly", () => {
            expect(module.localReports).toBeInstanceOf(LocalReportRepository);
            expect(module.reports).toBeInstanceOf(ReportRepository);
            expect(module.settings).toBeInstanceOf(ReportsSettingsRepository);
        });
    });

    describe("createChannel", () => {
        beforeEach(() => {
            vi.spyOn(module.client.api.guilds, "createChannel").mockResolvedValue({
                ...mockChannel,
                position: 0,
                available_tags: REPORT_CHANNEL_TAGS.map((tag) => ({
                    emoji_id: null,
                    emoji_name: null,
                    id: "79072635294295180",
                    moderated: true,
                    name: tag
                })),
                default_auto_archive_duration: 60,
                default_forum_layout: 0,
                default_reaction_emoji: null,
                default_sort_order: 0,
                default_thread_rate_limit_per_user: 0,
                name: "reports",
                permission_overwrites: [{
                    allow: "0",
                    deny: "1024",
                    id: "49072635294295155",
                    type: OverwriteType.Role
                }],
                topic: REPORT_CHANNEL_GUIDELINES,
                type: ChannelType.GuildForum
            });
        });

        it("should create a channel with the correct data", async () => {
            await module.createChannel("49072635294295155");

            expect(module.client.api.guilds.createChannel).toHaveBeenCalledOnce();
            expect(module.client.api.guilds.createChannel).toHaveBeenCalledWith("49072635294295155", {
                available_tags: REPORT_CHANNEL_TAGS.map((tag) => ({
                    emoji_id: null,
                    emoji_name: null,
                    id: "",
                    moderated: true,
                    name: tag
                })),
                name: "reports",
                permission_overwrites: [{
                    deny: "1024",
                    id: "49072635294295155",
                    type: OverwriteType.Role
                }],
                topic: REPORT_CHANNEL_GUIDELINES,
                type: ChannelType.GuildForum
            });
        });

        it("should update the settings with the channel ID", async () => {
            const updateSpy = vi.spyOn(module.settings, "upsert");

            await module.createChannel("49072635294295155");

            expect(updateSpy).toHaveBeenCalledOnce();
            expect(updateSpy).toHaveBeenCalledWith("49072635294295155", {
                channelID: mockChannel.id,
                tagAccepted: "79072635294295180",
                tagCopyright: "79072635294295180",
                tagFalseInformation: "79072635294295180",
                tagIgnored: "79072635294295180",
                tagInappropriate: "79072635294295180",
                tagOpen: "79072635294295180",
                tagOther: "79072635294295180",
                tagScamsFraud: "79072635294295180"
            });
        });
    });

    describe("getCategoryFromReason", () => {
        describe("Profiles", () => {
            it("should return 'Copyright' if the reason belongs to that category", () => {
                const expected = ReportCategory.Copyright;
                const category = module.getCategoryFromReason(REPORT_DEFAULT_PROFILE_REASONS[expected][0]);

                expect(category).toBe(expected);
            });

            it("should return 'False Information' if the reason belongs to that category", () => {
                const expected = ReportCategory.FalseInformation;
                const category = module.getCategoryFromReason(REPORT_DEFAULT_PROFILE_REASONS[expected][0]);

                expect(category).toBe(expected);
            });

            it("should return 'Inappropriate' if the reason belongs to that category", () => {
                const expected = ReportCategory.Inappropriate;
                const category = module.getCategoryFromReason(REPORT_DEFAULT_PROFILE_REASONS[expected][0]);

                expect(category).toBe(expected);
            });

            it("should return 'Scams & Fraud' if the reason belongs to that category", () => {
                const expected = ReportCategory.ScamsFraud;
                const category = module.getCategoryFromReason(REPORT_DEFAULT_PROFILE_REASONS[expected][0]);

                expect(category).toBe(expected);
            });
        });

        describe("Requests", () => {
            it("should return 'False Information' if the reason belongs to that category", () => {
                const expected = ReportCategory.FalseInformation;
                const category = module.getCategoryFromReason(REPORT_DEFAULT_REQUEST_REASONS[expected][0]);

                expect(category).toBe(expected);
            });

            it("should return 'Inappropriate' if the reason belongs to that category", () => {
                const expected = ReportCategory.Inappropriate;
                const category = module.getCategoryFromReason(REPORT_DEFAULT_REQUEST_REASONS[expected][0]);

                expect(category).toBe(expected);
            });

            it("should return 'Scams & Fraud' if the reason belongs to that category", () => {
                const expected = ReportCategory.ScamsFraud;
                const category = module.getCategoryFromReason(REPORT_DEFAULT_REQUEST_REASONS[expected][0]);

                expect(category).toBe(expected);
            });
        });

        it("should return 'Other' if the reason is not found", () => {
            const category = module.getCategoryFromReason("This reason doesn't exist.");

            expect(category).toBe(ReportCategory.Other);
        });
    });

    describe("getTagFromCategory", () => {
        it("should return the 'Copyright' tag if the category is 'Copyright'", () => {
            const expected = "68239102456844360";
            const tag = module.getTagFromCategory({
                tagCopyright: expected
            } as ReportsSettings, ReportCategory.Copyright);

            expect(tag).toBe(expected);
        });

        it("should return the 'Scams & Fraud' tag if the category is 'Scams & Fraud'", () => {
            const expected = "68239102456844360";
            const tag = module.getTagFromCategory({
                tagScamsFraud: expected
            } as ReportsSettings, ReportCategory.ScamsFraud);

            expect(tag).toBe(expected);
        });

        it("should return the 'Inappropriate' tag if the category is 'Inappropriate'", () => {
            const expected = "68239102456844360";
            const tag = module.getTagFromCategory({
                tagInappropriate: expected
            } as ReportsSettings, ReportCategory.Inappropriate);

            expect(tag).toBe(expected);
        });

        it("should return the 'False Information' tag if the category is 'False Information'", () => {
            const expected = "68239102456844360";
            const tag = module.getTagFromCategory({
                tagFalseInformation: expected
            } as ReportsSettings, ReportCategory.FalseInformation);

            expect(tag).toBe(expected);
        });

        it("should return the 'Other' tag if the category is 'Other'", () => {
            const expected = "68239102456844360";
            const tag = module.getTagFromCategory({
                tagOther: expected
            } as ReportsSettings, ReportCategory.Other);

            expect(tag).toBe(expected);
        });
    });

    describe("handleChannel", () => {
        let interaction: UpdatableInteraction;
        let option: ChannelGuildSettingOption<ReportsSettings, "channelID">;
        let response: MessageComponentInteraction;

        beforeEach(() => {
            const data = createMockMessageComponentInteraction();
            interaction = new UpdatableInteraction(data, module.client, vi.fn());
            interaction.editParent = vi.fn();

            const responseData = createMockMessageComponentInteraction();
            response = new MessageComponentInteraction(responseData, module.client, vi.fn());
            response.appPermissions = PermissionFlagsBits.ManageChannels;
            response.editParent = vi.fn();

            const config = module.getConfig();
            option = config.find((option) => {
                return "key" in option && option.key === "channelID";
            }) as ChannelGuildSettingOption<ReportsSettings, "channelID">;

            module.createChannel = vi.fn();
            ChannelGuildSettingOption.prototype.handle = vi.fn();
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
        });

        describe("New Channel", () => {
            beforeEach(() => {
                response.data.customID = "new_channel";
            });

            it("should create a new channel if the user selects 'New Channel'", async () => {
                await module.handleChannel(option, interaction);

                expect(module.createChannel).toHaveBeenCalledOnce();
                expect(module.createChannel).toHaveBeenCalledWith("68239102456844360");
            });

            it("should ignore if the interaction was not invoked in a guild", async () => {
                delete response.guildID;

                await module.handleChannel(option, interaction);

                expect(module.createChannel).not.toHaveBeenCalled();
            });

            it("should show an error message if the bot does not have sufficient permissions", async () => {
                response.appPermissions = 0n;

                await module.handleChannel(option, interaction);

                expect(response.editParent).toHaveBeenCalledOnce();
                expect(response.editParent).toHaveBeenCalledWith({
                    components: [],
                    content: expect.stringContaining("I do not have permission to create channels.")
                });
            });
        });

        describe("Existing Channel", () => {
            beforeEach(() => {
                response.data.customID = "existing_channel";
            });

            it("should use an existing channel if the user selects 'Existing Channel'", async () => {
                await module.handleChannel(option, interaction);

                expect(module.createChannel).not.toHaveBeenCalled();
                expect(ChannelGuildSettingOption.prototype.handle).toHaveBeenCalledOnce();
            });
        });

        it("should show a timeout message if the user does not respond", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

            await module.handleChannel(option, interaction);

            expect(interaction.editParent).toHaveBeenCalledTimes(2);
            expect(interaction.editParent).toHaveBeenCalledWith(timeoutContent);
        });
    });
});
