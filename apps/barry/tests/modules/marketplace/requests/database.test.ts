import { type RequestsSettings, Prisma, RequestStatus } from "@prisma/client";
import {
    RequestMessageRepository,
    RequestRepository,
    RequestsSettingsRepository
} from "../../../../src/modules/marketplace/dependencies/requests/database.js";

import { mockChannel } from "@barry/testing";
import { mockRequest } from "./mocks/request.js";
import { prisma } from "../../../mocks/index.js";

describe("RequestRepository", () => {
    const userID = "257522665441460225";
    const requestID = 1;

    let repository: RequestRepository;

    beforeEach(() => {
        repository = new RequestRepository(prisma);
    });

    describe("delete", () => {
        it("should delete an existing request", async () => {
            await repository.delete(requestID);

            expect(prisma.request.delete).toHaveBeenCalledOnce();
            expect(prisma.request.delete).toHaveBeenCalledWith({ where: { id: requestID } });
        });
    });

    describe("getAvailableByUser", () => {
        it("should return the available requests for the specified user", async () => {
            vi.mocked(prisma.request.findMany).mockResolvedValue([mockRequest]);

            const entities = await repository.getAvailableByUser(userID);

            expect(entities).toEqual([mockRequest]);
            expect(prisma.request.findMany).toHaveBeenCalledOnce();
            expect(prisma.request.findMany).toHaveBeenCalledWith({
                include: { attachments: true },
                orderBy: { updatedAt: "desc" },
                where: {
                    status: RequestStatus.Available,
                    userID: userID
                }
            });
        });

        it("should return an empty array if the user has no available requests", async () => {
            vi.mocked(prisma.request.findMany).mockResolvedValue([]);

            const entities = await repository.getAvailableByUser(userID);

            expect(entities).toEqual([]);
        });
    });

    describe("getByMessage", () => {
        it("should return the request associated with the specified message", async () => {
            vi.mocked(prisma.request.findFirst).mockResolvedValue(mockRequest);

            const entity = await repository.getByMessage("91256340920236565");

            expect(entity).toEqual(mockRequest);
            expect(prisma.request.findFirst).toHaveBeenCalledOnce();
            expect(prisma.request.findFirst).toHaveBeenCalledWith({
                where: {
                    messages: {
                        some: {
                            messageID: "91256340920236565"
                        }
                    }
                }
            });
        });

        it("should return null if no request is found", async () => {
            vi.mocked(prisma.request.findFirst).mockResolvedValue(null);

            const entity = await repository.getByMessage("91256340920236565");

            expect(entity).toBe(null);
        });
    });

    describe("getDraft", () => {
        it("should return the draft request for the specified user", async () => {
            vi.mocked(prisma.request.findFirst).mockResolvedValue(mockRequest);

            const entity = await repository.getDraft(userID);

            expect(entity).toEqual(mockRequest);
            expect(prisma.request.findFirst).toHaveBeenCalledOnce();
            expect(prisma.request.findFirst).toHaveBeenCalledWith({
                include: { attachments: true },
                where: {
                    status: {
                        in: [
                            RequestStatus.DraftContact,
                            RequestStatus.DraftAttachments,
                            RequestStatus.DraftPreview
                        ]
                    },
                    userID: userID
                }
            });
        });

        it("should return null if the user has no draft request", async () => {
            vi.mocked(prisma.request.findFirst).mockResolvedValue(null);

            const entity = await repository.getDraft(userID);

            expect(entity).toBe(null);
        });
    });

    describe("getEditableByUser", () => {
        it("should return the editable requests for the specified user", async () => {
            vi.mocked(prisma.request.findMany).mockResolvedValue([mockRequest]);

            const entities = await repository.getEditableByUser(userID);

            expect(entities).toEqual([mockRequest]);
            expect(prisma.request.findMany).toHaveBeenCalledOnce();
            expect(prisma.request.findMany).toHaveBeenCalledWith({
                include: { attachments: true },
                orderBy: { updatedAt: "desc" },
                where: {
                    status: {
                        in: [
                            RequestStatus.Available,
                            RequestStatus.Taken
                        ]
                    },
                    userID: userID
                }
            });
        });

        it("should return an empty array if the user has no editable requests", async () => {
            vi.mocked(prisma.request.findMany).mockResolvedValue([]);

            const entities = await repository.getEditableByUser(userID);

            expect(entities).toEqual([]);
        });
    });

    describe("upsert", () => {
        it("should update an existing draft if one exists", async () => {
            vi.mocked(prisma.request.findFirst).mockResolvedValue(mockRequest);

            const data = { ...mockRequest } as Prisma.RequestCreateInput;
            delete data.attachments;

            await repository.upsert(userID, data);

            expect(prisma.request.update).toHaveBeenCalledOnce();
            expect(prisma.request.update).toHaveBeenCalledWith({
                data: data,
                include: { attachments: true },
                where: { id: mockRequest.id }
            });
        });

        it("should delete existing attachments if the attachments is being updated", async () => {
            vi.mocked(prisma.request.findFirst).mockResolvedValue(mockRequest);

            await repository.upsert(userID, { ...mockRequest, attachments: { create: [] } });

            expect(prisma.request.update).toHaveBeenCalledOnce();
            expect(prisma.request.update).toHaveBeenCalledWith({
                data: {
                    ...mockRequest,
                    attachments: {
                        deleteMany: {},
                        create: []
                    }
                },
                include: { attachments: true },
                where: { id: mockRequest.id }
            });
        });

        it("should create a new draft if one does not exist", async () => {
            vi.mocked(prisma.request.findFirst).mockResolvedValue(null);

            await repository.upsert(userID, mockRequest as Prisma.RequestCreateInput);

            expect(prisma.request.create).toHaveBeenCalledOnce();
            expect(prisma.request.create).toHaveBeenCalledWith({
                data: mockRequest,
                include: { attachments: true }
            });
        });

        it("should throw an error if the compensation is missing", async () => {
            vi.mocked(prisma.request.findFirst).mockResolvedValue(null);

            const data = { ...mockRequest, compensation: undefined } as unknown as Prisma.RequestCreateInput;

            await expect(() => repository.upsert(userID, data)).rejects.toThrowError(
                "Missing required fields."
            );
        });

        it("should throw an error if the description is missing", async () => {
            vi.mocked(prisma.request.findFirst).mockResolvedValue(null);

            const data = { ...mockRequest, description: undefined } as unknown as Prisma.RequestCreateInput;

            await expect(() => repository.upsert(userID, data)).rejects.toThrowError(
                "Missing required fields."
            );
        });

        it("should throw an error if the title is missing", async () => {
            vi.mocked(prisma.request.findFirst).mockResolvedValue(null);

            const data = { ...mockRequest, title: undefined } as unknown as Prisma.RequestCreateInput;

            await expect(() => repository.upsert(userID, data)).rejects.toThrowError(
                "Missing required fields."
            );
        });
    });
});

describe("RequestMessageRepository", () => {
    const guildID = "68239102456844360";
    const messageID = "91256340920236565";
    const requestID = 1;

    let repository: RequestMessageRepository;

    beforeEach(() => {
        repository = new RequestMessageRepository(prisma);
    });

    describe("create", () => {
        it("should create a new request message record", async () => {
            await repository.create(messageID, guildID, requestID);

            expect(prisma.requestMessage.create).toHaveBeenCalledOnce();
            expect(prisma.requestMessage.create).toHaveBeenCalledWith({
                data: {
                    guildID,
                    messageID,
                    requestID
                }
            });
        });
    });

    describe("getLatest", () => {
        it("should return the latest request message for the specified member", async () => {
            vi.mocked(prisma.requestMessage.findFirst).mockResolvedValue({
                guildID,
                messageID,
                requestID
            });

            const entity = await repository.getLatest(guildID, requestID);

            expect(entity).toEqual({ guildID, messageID, requestID });
            expect(prisma.requestMessage.findFirst).toHaveBeenCalledOnce();
            expect(prisma.requestMessage.findFirst).toHaveBeenCalledWith({
                orderBy: { messageID: "desc" },
                where: { guildID, requestID }
            });
        });

        it("should return null if the user has not yet posted a message in the specified guild", async () => {
            vi.mocked(prisma.requestMessage.findFirst).mockResolvedValue(null);

            const entity = await repository.getLatest(guildID, requestID);

            expect(entity).toBeNull();
        });
    });
});

describe("RequestsSettingsRepository", () => {
    const guildID = "68239102456844360";

    let repository: RequestsSettingsRepository;
    let settings: RequestsSettings;

    beforeEach(() => {
        repository = new RequestsSettingsRepository(prisma);
        settings = {
            channelID: mockChannel.id,
            enabled: true,
            guildID: guildID,
            lastMessageID: null,
            minCompensation: 50
        };
    });

    describe("getOrCreate", () => {
        it("should return the requests settings for a guild", async () => {
            vi.mocked(prisma.requestsSettings.upsert).mockResolvedValue(settings);

            const entity = await repository.getOrCreate(guildID);

            expect(entity).toEqual(settings);
            expect(prisma.requestsSettings.upsert).toHaveBeenCalledOnce();
            expect(prisma.requestsSettings.upsert).toHaveBeenCalledWith({
                create: { guildID },
                update: {},
                where: { guildID }
            });
        });
    });

    describe("upsert", () => {
        it("should upsert the provided level up settings record", async () => {
            await repository.upsert(guildID, {
                lastMessageID: "91256340920236565"
            });

            expect(prisma.requestsSettings.upsert).toHaveBeenCalledOnce();
            expect(prisma.requestsSettings.upsert).toHaveBeenCalledWith({
                create: {
                    guildID: guildID,
                    lastMessageID: "91256340920236565"
                },
                update: {
                    lastMessageID: "91256340920236565"
                },
                where: { guildID }
            });
        });
    });
});
