import { StarboardReactionRepository } from "../../../../src/modules/starboard/database/StarboardReactionRepository.js";
import { prisma } from "../../../mocks/index.js";

describe("StarboardReactionRepository", () => {
    const channelID = "68239102456844360";
    const messageID = "91256340920236565";
    const userID = "257522665437265920";

    let repository: StarboardReactionRepository;

    beforeEach(() => {
        repository = new StarboardReactionRepository(prisma);
    });

    describe("create", () => {
        it("should create a new starboard reaction", async () => {
            await repository.create(channelID, messageID, userID);

            expect(prisma.starboardReaction.create).toHaveBeenCalledOnce();
            expect(prisma.starboardReaction.create).toHaveBeenCalledWith({
                data: {
                    message: {
                        connect: {
                            channelID_messageID: {
                                channelID,
                                messageID
                            }
                        }
                    },
                    userID: userID
                }
            });
        });
    });

    describe("delete", () => {
        it("should delete the starboard reaction", async () => {
            await repository.delete(channelID, messageID, userID);

            expect(prisma.starboardReaction.delete).toHaveBeenCalledOnce();
            expect(prisma.starboardReaction.delete).toHaveBeenCalledWith({
                where: {
                    channelID_messageID_userID: {
                        channelID,
                        messageID,
                        userID
                    }
                }
            });
        });
    });

    describe("deleteAll", () => {
        it("should delete all starboard reactions for the specified message", async () => {
            await repository.deleteAll(channelID, messageID);

            expect(prisma.starboardReaction.deleteMany).toHaveBeenCalledOnce();
            expect(prisma.starboardReaction.deleteMany).toHaveBeenCalledWith({
                where: {
                    channelID,
                    messageID
                }
            });
        });
    });

    describe("getCount", () => {
        it("should retrieve the amount of starboard reactions for the specified message", async () => {
            await repository.getCount(channelID, messageID);

            expect(prisma.starboardReaction.count).toHaveBeenCalledOnce();
            expect(prisma.starboardReaction.count).toHaveBeenCalledWith({
                where: {
                    channelID,
                    messageID
                }
            });
        });
    });

    describe("has", () => {
        it("should return true if the starboard reaction exists", async () => {
            prisma.starboardReaction.findUnique.mockResolvedValue({
                channelID,
                messageID,
                userID
            });

            const hasReaction = await repository.has(channelID, messageID, userID);

            expect(hasReaction).toBe(true);
            expect(prisma.starboardReaction.findUnique).toHaveBeenCalledOnce();
            expect(prisma.starboardReaction.findUnique).toHaveBeenCalledWith({
                where: {
                    channelID_messageID_userID: {
                        channelID,
                        messageID,
                        userID
                    }
                }
            });
        });

        it("should return false if the starboard reaction does not exist", async () => {
            prisma.starboardReaction.findUnique.mockResolvedValue(null);

            const hasReaction = await repository.has(channelID, messageID, userID);

            expect(hasReaction).toBe(false);
            expect(prisma.starboardReaction.findUnique).toHaveBeenCalledOnce();
            expect(prisma.starboardReaction.findUnique).toHaveBeenCalledWith({
                where: {
                    channelID_messageID_userID: {
                        channelID,
                        messageID,
                        userID
                    }
                }
            });
        });
    });
});
