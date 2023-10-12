import { StarboardMessageRepository } from "../../../../src/modules/starboard/database/index.js";
import { prisma } from "../../../mocks/index.js";

describe("StarboardMessageRepository", () => {
    const authorID = "68239102456844360";
    const channelID = "68239102456844360";
    const messageID = "68239102456844360";
    const guildID = "68239102456844360";

    let repository: StarboardMessageRepository;

    beforeEach(() => {
        repository = new StarboardMessageRepository(prisma);
    });

    describe("create", () => {
        it("should create a new starboard message", async () => {
            await repository.create({
                authorID,
                channelID,
                guildID,
                messageID
            });

            expect(prisma.starboardMessage.create).toHaveBeenCalledOnce();
            expect(prisma.starboardMessage.create).toHaveBeenCalledWith({
                data: {
                    authorID,
                    channelID,
                    guildID,
                    messageID
                }
            });
        });
    });

    describe("delete", () => {
        it("should delete the starboard message", async () => {
            await repository.delete(channelID, messageID);

            expect(prisma.starboardMessage.delete).toHaveBeenCalledOnce();
            expect(prisma.starboardMessage.delete).toHaveBeenCalledWith({
                where: {
                    channelID_messageID: {
                        channelID,
                        messageID
                    }
                }
            });
        });
    });

    describe("get", () => {
        it("should retrieve the starboard message for the specified message", async () => {
            await repository.get(channelID, messageID);

            expect(prisma.starboardMessage.findUnique).toHaveBeenCalledOnce();
            expect(prisma.starboardMessage.findUnique).toHaveBeenCalledWith({
                where: {
                    channelID_messageID: {
                        channelID,
                        messageID
                    }
                }
            });
        });
    });

    describe("setCrosspostID", () => {
        it("should set the crosspost ID of the starboard message", async () => {
            const crosspostID = "68239102456844360";

            await repository.setCrosspostID(channelID, messageID, crosspostID);

            expect(prisma.starboardMessage.update).toHaveBeenCalledOnce();
            expect(prisma.starboardMessage.update).toHaveBeenCalledWith({
                where: {
                    channelID_messageID: {
                        channelID,
                        messageID
                    }
                },
                data: { crosspostID }
            });
        });
    });
});
