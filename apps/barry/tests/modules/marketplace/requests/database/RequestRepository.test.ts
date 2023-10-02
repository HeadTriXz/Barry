import { Prisma, RequestStatus } from "@prisma/client";
import { RequestRepository } from "../../../../../src/modules/marketplace/dependencies/requests/database/index.js";
import { mockRequest } from "../mocks/request.js";
import { prisma } from "../../../../mocks/index.js";

describe("RequestRepository", () => {
    const guildID = "68239102456844360";
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

    describe("getFlaggableByUser", () => {
        it("should return the flaggable requests for the specified user", async () => {
            vi.useFakeTimers().setSystemTime("01-01-2023");
            vi.mocked(prisma.request.findMany).mockResolvedValue([mockRequest]);

            const timestamp = BigInt(Date.now() - 1421280000000);
            const minimumID = String(timestamp << 22n);

            const entities = await repository.getFlaggableByUser("68239102456844360", userID);

            expect(entities).toEqual([mockRequest]);
            expect(prisma.request.findMany).toHaveBeenCalledOnce();
            expect(prisma.request.findMany).toHaveBeenCalledWith({
                include: {
                    attachments: true,
                    messages: {
                        where: {
                            guildID: guildID,
                            messageID: {
                                gte: minimumID
                            }
                        }
                    }
                },
                where: {
                    messages: {
                        some: {
                            guildID: guildID,
                            messageID: {
                                gte: minimumID
                            }
                        }
                    },
                    userID: userID
                }
            });
        });

        it("should return an empty array if the user has no flaggable requests", async () => {
            vi.mocked(prisma.request.findMany).mockResolvedValue([]);

            const entities = await repository.getFlaggableByUser("68239102456844360", userID, 7);

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
