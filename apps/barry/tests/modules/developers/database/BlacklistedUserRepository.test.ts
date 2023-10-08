import { BlacklistedUserRepository } from "../../../../src/modules/developers/database/BlacklistedUserRepository.js";
import { prisma } from "../../../mocks/index.js";

describe("BlacklistedUserRepository", () => {
    const userID = "257522665437265920";

    let repository: BlacklistedUserRepository;

    beforeEach(() => {
        repository = new BlacklistedUserRepository(prisma);
    });

    describe("blacklist", () => {
        it("should blacklist the user", async () => {
            await repository.blacklist(userID);

            expect(prisma.blacklistedUser.create).toHaveBeenCalledOnce();
            expect(prisma.blacklistedUser.create).toHaveBeenCalledWith({
                data: { userID }
            });
        });
    });

    describe("isBlacklisted", () => {
        it("should return true if the user is blacklisted", async () => {
            prisma.blacklistedUser.findUnique.mockResolvedValueOnce({ userID });

            const isBlacklisted = await repository.isBlacklisted(userID);

            expect(isBlacklisted).toBe(true);
            expect(prisma.blacklistedUser.findUnique).toHaveBeenCalledOnce();
            expect(prisma.blacklistedUser.findUnique).toHaveBeenCalledWith({
                where: { userID }
            });
        });

        it("should return false if the user is not blacklisted", async () => {
            prisma.blacklistedUser.findUnique.mockResolvedValueOnce(null);

            const isBlacklisted = await repository.isBlacklisted(userID);

            expect(isBlacklisted).toBe(false);
            expect(prisma.blacklistedUser.findUnique).toHaveBeenCalledOnce();
            expect(prisma.blacklistedUser.findUnique).toHaveBeenCalledWith({
                where: { userID }
            });
        });
    });

    describe("unblacklist", () => {
        it("should unblacklist the user", async () => {
            await repository.unblacklist(userID);

            expect(prisma.blacklistedUser.delete).toHaveBeenCalledOnce();
            expect(prisma.blacklistedUser.delete).toHaveBeenCalledWith({
                where: { userID }
            });
        });
    });
});
