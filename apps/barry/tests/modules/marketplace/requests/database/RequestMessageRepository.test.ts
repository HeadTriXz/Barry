import { RequestMessageRepository } from "../../../../../src/modules/marketplace/dependencies/requests/database/index.js";
import { prisma } from "../../../../mocks/index.js";

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
