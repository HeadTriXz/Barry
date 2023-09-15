import type { RequestsSettings } from "@prisma/client";

import { ButtonStyle, ComponentType } from "@discordjs/core";
import {
    RequestMessageRepository,
    RequestRepository,
    RequestsSettingsRepository
} from "../../../../src/modules/marketplace/dependencies/requests/database.js";
import { mockUser, mockMessage } from "@barry/testing";

import { DiscordAPIError } from "@discordjs/rest";
import { createMockApplication } from "../../../mocks/application.js";
import { getRequestContent } from "../../../../src/modules/marketplace/dependencies/requests/editor/functions/content.js";
import { mockRequest } from "./mocks/request.js";

import RequestsModule, {
    ManageRequestButton,
    RequestActionButton
} from "../../../../src/modules/marketplace/dependencies/requests/index.js";

describe("RequestsModule", () => {
    const channelID = "48527482987641760";
    const guildID = "68239102456844360";

    let module: RequestsModule;
    let settings: RequestsSettings;

    beforeEach(() => {
        const client = createMockApplication();
        module = new RequestsModule(client);

        settings = {
            channelID: "48527482987641760",
            enabled: true,
            guildID: "68239102456844360",
            lastMessageID: null,
            minCompensation: 50
        };
    });

    describe("constructor", () => {
        it("should set up the repositories correctly", () => {
            expect(module.requestMessages).toBeInstanceOf(RequestMessageRepository);
            expect(module.requests).toBeInstanceOf(RequestRepository);
            expect(module.requestsSettings).toBeInstanceOf(RequestsSettingsRepository);
        });
    });

    describe("flagUser", () => {
        beforeEach(() => {
            vi.spyOn(module.client.api.channels, "editMessage").mockResolvedValue(mockMessage);
            vi.spyOn(module.requests, "getFlaggableByUser").mockResolvedValueOnce([{
                ...mockRequest,
                messages: [{
                    guildID: guildID,
                    messageID: "30527482987641765",
                    requestID: 1
                }]
            }]);
        });

        it("should flag all requests that are newer than 14 days", async () => {
            await module.flagUser(guildID, channelID, mockUser, "Hello World!");

            expect(module.requests.getFlaggableByUser).toHaveBeenCalledOnce();
            expect(module.requests.getFlaggableByUser).toHaveBeenCalledWith(guildID, mockUser.id, 14);
        });
    });

    describe("isEnabled", () => {
        it("should return true if the guild has the module enabled", async () => {
            const settingsSpy = vi.spyOn(module.requestsSettings, "getOrCreate").mockResolvedValue(settings);

            const enabled = await module.isEnabled("68239102456844360");

            expect(settingsSpy).toHaveBeenCalledOnce();
            expect(settingsSpy).toHaveBeenCalledWith("68239102456844360");
            expect(enabled).toBe(true);
        });

        it("should return false if the guild has the module disabled", async () => {
            const settingsSpy = vi.spyOn(module.requestsSettings, "getOrCreate").mockResolvedValue(settings);
            settings.enabled = false;

            const enabled = await module.isEnabled("68239102456844360");

            expect(settingsSpy).toHaveBeenCalledOnce();
            expect(settingsSpy).toHaveBeenCalledWith("68239102456844360");
            expect(enabled).toBe(false);
        });
    });

    describe("isValidCompensation", () => {
        it("should return false if the compensation does not contain a number", () => {
            const isValid = module.isValidCompensation("test", 50);

            expect(isValid).toBe(false);
        });

        it("should return false if the compensation is less than the minimum", () => {
            const isValid = module.isValidCompensation("$20", 50);

            expect(isValid).toBe(false);
        });

        it("should return false if one of the numbers is less than the minimum", () => {
            const isValid = module.isValidCompensation("$100, just kidding, $20", 50);

            expect(isValid).toBe(false);
        });

        it("should return true if the compensation is valid", () => {
            const isValid = module.isValidCompensation("$100", 50);

            expect(isValid).toBe(true);
        });
    });

    describe("postRequest", () => {
        it("should post the request in the configured channel", async () => {
            const createSpy = vi.spyOn(module.client.api.channels, "createMessage").mockResolvedValue(mockMessage);
            const content = getRequestContent(mockUser, mockRequest);

            await module.postRequest(mockUser, mockRequest, settings);

            expect(createSpy).toHaveBeenCalledTimes(2);
            expect(createSpy).toHaveBeenCalledWith("48527482987641760", {
                ...content,
                components: [{
                    components: [
                        {
                            custom_id: RequestActionButton.Contact,
                            label: "Contact",
                            style: ButtonStyle.Success,
                            type: ComponentType.Button
                        },
                        {
                            custom_id: RequestActionButton.Report,
                            label: "Report",
                            style: ButtonStyle.Secondary,
                            type: ComponentType.Button
                        }
                    ],
                    type: ComponentType.ActionRow
                }]
            });
        });

        it("should post the buttons after the request", async () => {
            const createSpy = vi.spyOn(module.client.api.channels, "createMessage").mockResolvedValue(mockMessage);

            await module.postRequest(mockUser, mockRequest, settings);

            expect(createSpy).toHaveBeenCalledTimes(2);
            expect(createSpy).toHaveBeenCalledWith("48527482987641760", {
                components: [{
                    components: [
                        {
                            custom_id: ManageRequestButton.Post,
                            label: "Post Request",
                            style: ButtonStyle.Success,
                            type: ComponentType.Button
                        },
                        {
                            custom_id: ManageRequestButton.Edit,
                            label: "Edit Request",
                            style: ButtonStyle.Secondary,
                            type: ComponentType.Button
                        }
                    ],
                    type: ComponentType.ActionRow
                }]
            });
        });

        it("should delete the previous buttons message", async () => {
            vi.spyOn(module.client.api.channels, "createMessage").mockResolvedValue(mockMessage);

            module.client.api.channels.deleteMessage = vi.fn();
            settings.lastMessageID = "91256340920236565";

            await module.postRequest(mockUser, mockRequest, settings);

            expect(module.client.api.channels.deleteMessage).toHaveBeenCalledOnce();
            expect(module.client.api.channels.deleteMessage).toHaveBeenCalledWith("48527482987641760", "91256340920236565");
        });

        it("should throw an error if the channel is unknown", async () => {
            settings.channelID = null;

            await expect(() => module.postRequest(mockUser, mockRequest, settings)).rejects.toThrowError(
                "Failed to post a request, channel is unknown."
            );
        });

        it("should handle errors when deleting the previous buttons message", async () => {
            vi.spyOn(module.client.api.channels, "createMessage").mockResolvedValue(mockMessage);
            vi.spyOn(module.client.api.channels, "deleteMessage").mockRejectedValue(new Error());
            settings.lastMessageID = "91256340920236565";

            const loggerSpy = vi.spyOn(module.client.logger, "warn");

            await module.postRequest(mockUser, mockRequest, settings);

            expect(loggerSpy).toHaveBeenCalledOnce();
            expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining("Could not delete last message"));
        });
    });

    describe("unflagUser", () => {
        beforeEach(() => {
            vi.spyOn(module.client.api.channels, "editMessage").mockResolvedValue(mockMessage);
            vi.spyOn(module.requests, "getFlaggableByUser").mockResolvedValueOnce([{
                ...mockRequest,
                messages: [{
                    guildID: guildID,
                    messageID: "30527482987641765",
                    requestID: 1
                }]
            }]);
        });

        it("should flag all requests that are newer than 21 days", async () => {
            await module.unflagUser(guildID, channelID, mockUser);

            expect(module.requests.getFlaggableByUser).toHaveBeenCalledOnce();
            expect(module.requests.getFlaggableByUser).toHaveBeenCalledWith(guildID, mockUser.id, 21);
        });
    });

    describe("#resetRequests", () => {
        beforeEach(() => {
            vi.spyOn(module.client.api.channels, "editMessage").mockResolvedValue(mockMessage);
            vi.spyOn(module.requests, "getFlaggableByUser").mockResolvedValueOnce([{
                ...mockRequest,
                messages: [{
                    guildID: guildID,
                    messageID: mockMessage.id,
                    requestID: 1
                }]
            }]);
        });

        it("should get all flaggable requests within the specified days", async () => {
            await module.flagUser(guildID, channelID, mockUser, "Hello World!");

            expect(module.requests.getFlaggableByUser).toHaveBeenCalledOnce();
            expect(module.requests.getFlaggableByUser).toHaveBeenCalledWith(guildID, mockUser.id, 14);
        });

        it("should append the provided embeds to the request content", async () => {
            const editSpy = vi.spyOn(module.client.api.channels, "editMessage");

            await module.flagUser(guildID, channelID, mockUser, "Hello World!");

            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith(channelID, mockMessage.id, {
                content: expect.any(String),
                embeds: [
                    expect.any(Object),
                    expect.any(Object)
                ]
            });
        });

        it("should log an error if the message could not be edited", async () => {
            const error = new Error("Oh no!");
            vi.spyOn(module.client.api.channels, "editMessage").mockRejectedValue(error);

            await module.flagUser(guildID, channelID, mockUser, "Hello World!");

            expect(module.client.logger.error).toHaveBeenCalledOnce();
            expect(module.client.logger.error).toHaveBeenCalledWith(error);
        });

        it("should not log an error if the message could not be edited because it was deleted", async () => {
            const response = {
                code: 10008,
                message: "Unknown message"
            };
            const error = new DiscordAPIError(response, 10008, 404, "DELETE", "", {});
            vi.spyOn(module.client.api.channels, "editMessage").mockRejectedValue(error);

            await module.flagUser(guildID, channelID, mockUser, "Hello World!");

            expect(module.client.logger.error).not.toHaveBeenCalled();
        });
    });
});
