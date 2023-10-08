import { ProfileMessageRepository } from "../../../../../src/modules/marketplace/dependencies/profiles/database/index.js";
import { prisma } from "../../../../mocks/index.js";

describe("ProfileMessageRepository", () => {
    const guildID = "68239102456844360";
    const messageID = "91256340920236565";
    const userID = "257522665441460225";

    let repository: ProfileMessageRepository;

    beforeEach(() => {
        repository = new ProfileMessageRepository(prisma);
    });

    describe("create", () => {
        it("should create a new profile message record", async () => {
            await repository.create(messageID, guildID, userID);

            expect(prisma.profileMessage.create).toHaveBeenCalledOnce();
            expect(prisma.profileMessage.create).toHaveBeenCalledWith({
                data: {
                    guildID,
                    messageID,
                    userID
                }
            });
        });
    });

    describe("getLatest", () => {
        it("should return the latest profile message for the specified member", async () => {
            vi.mocked(prisma.profileMessage.findFirst).mockResolvedValue({
                guildID,
                messageID,
                userID
            });

            const entity = await repository.getLatest(guildID, userID);

            expect(entity).toEqual({ guildID, messageID, userID });
            expect(prisma.profileMessage.findFirst).toHaveBeenCalledOnce();
            expect(prisma.profileMessage.findFirst).toHaveBeenCalledWith({
                orderBy: { messageID: "desc" },
                where: { guildID, userID }
            });
        });

        it("should return null if the user has not yet posted a message in the specified guild", async () => {
            vi.mocked(prisma.profileMessage.findFirst).mockResolvedValue(null);

            const entity = await repository.getLatest(guildID, userID);

            expect(entity).toBeNull();
        });
    });
});
