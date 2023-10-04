import { BlacklistedGuildRepository } from "../../../../src/modules/developers/database/BlacklistedGuildRepository.js";
import { prisma } from "../../../mocks/index.js";

describe("BlacklistedGuildRepository", () => {
    const guildID = "68239102456844360";

    let repository: BlacklistedGuildRepository;

    beforeEach(() => {
        repository = new BlacklistedGuildRepository(prisma);
    });

    describe("blacklist", () => {
        it("should blacklist the guild", async () => {
            await repository.blacklist(guildID);

            expect(prisma.blacklistedGuild.create).toHaveBeenCalledOnce();
            expect(prisma.blacklistedGuild.create).toHaveBeenCalledWith({
                data: { guildID }
            });
        });
    });

    describe("isBlacklisted", () => {
        it("should return true if the guild is blacklisted", async () => {
            prisma.blacklistedGuild.findUnique.mockResolvedValueOnce({ guildID });

            const isBlacklisted = await repository.isBlacklisted(guildID);

            expect(isBlacklisted).toBe(true);
            expect(prisma.blacklistedGuild.findUnique).toHaveBeenCalledOnce();
            expect(prisma.blacklistedGuild.findUnique).toHaveBeenCalledWith({
                where: { guildID }
            });
        });

        it("should return false if the guild is not blacklisted", async () => {
            prisma.blacklistedGuild.findUnique.mockResolvedValueOnce(null);

            const isBlacklisted = await repository.isBlacklisted(guildID);

            expect(isBlacklisted).toBe(false);
            expect(prisma.blacklistedGuild.findUnique).toHaveBeenCalledOnce();
            expect(prisma.blacklistedGuild.findUnique).toHaveBeenCalledWith({
                where: { guildID }
            });
        });
    });

    describe("unblacklist", () => {
        it("should unblacklist the guild", async () => {
            await repository.unblacklist(guildID);

            expect(prisma.blacklistedGuild.delete).toHaveBeenCalledOnce();
            expect(prisma.blacklistedGuild.delete).toHaveBeenCalledWith({
                where: { guildID }
            });
        });
    });
});
