import { ProfileRepository } from "../../../../../src/modules/marketplace/dependencies/profiles/database/index.js";
import { mockProfile } from "../mocks/profile.js";
import { prisma } from "../../../../mocks/index.js";

describe("ProfileRepository", () => {
    const guildID = "68239102456844360";
    const userID = "257522665441460225";
    let repository: ProfileRepository;

    beforeEach(() => {
        repository = new ProfileRepository(prisma);
    });

    describe("create", () => {
        it("should create a new profile record for the specified user", async () => {
            await repository.create({
                about: "Hello world!",
                userID: userID
            });

            expect(prisma.profile.create).toHaveBeenCalledOnce();
            expect(prisma.profile.create).toHaveBeenCalledWith({
                data: {
                    about: "Hello world!",
                    userID: userID
                }
            });
        });
    });

    describe("get", () => {
        it("should retrieve the profile record for the specified user", async () => {
            vi.mocked(prisma.profile.findUnique).mockResolvedValue(mockProfile);

            const entity = await repository.get(userID);

            expect(entity).toEqual(mockProfile);
            expect(prisma.profile.findUnique).toHaveBeenCalledOnce();
            expect(prisma.profile.findUnique).toHaveBeenCalledWith({
                where: { userID }
            });
        });

        it("should return null when no profile record is found", async () => {
            vi.mocked(prisma.profile.findUnique).mockResolvedValue(null);

            const entity = await repository.get(userID);

            expect(entity).toBeNull();
        });
    });

    describe("getByMessage", () => {
        it("should retrieve the profile record for the specified message", async () => {
            vi.mocked(prisma.profile.findFirst).mockResolvedValue(mockProfile);

            const entity = await repository.getByMessage("91256340920236565");

            expect(entity).toEqual(mockProfile);
            expect(prisma.profile.findFirst).toHaveBeenCalledOnce();
            expect(prisma.profile.findFirst).toHaveBeenCalledWith({
                where: {
                    messages: {
                        some: {
                            messageID: "91256340920236565"
                        }
                    }
                }
            });
        });

        it("should return null when no profile record is found", async () => {
            vi.mocked(prisma.profile.findFirst).mockResolvedValue(null);

            const entity = await repository.getByMessage(userID);

            expect(entity).toBeNull();
        });
    });

    describe("getWithFlaggableMessages", () => {
        it("should retrieve the profile record for the specified user", async () => {
            vi.useFakeTimers().setSystemTime("01-01-2023");
            vi.mocked(prisma.profile.findUnique).mockResolvedValue(mockProfile);

            const timestamp = BigInt(Date.now() - 1421280000000);
            const minimumID = String(timestamp << 22n);

            const entity = await repository.getWithFlaggableMessages(guildID, userID);

            expect(entity).toEqual(mockProfile);
            expect(prisma.profile.findUnique).toHaveBeenCalledOnce();
            expect(prisma.profile.findUnique).toHaveBeenCalledWith({
                include: {
                    messages: {
                        where: {
                            guildID: guildID,
                            messageID: {
                                gte: minimumID
                            }
                        }
                    }
                },
                where: { userID }
            });
        });

        it("should return null when no profile record is found", async () => {
            vi.mocked(prisma.profile.findUnique).mockResolvedValue(null);

            const entity = await repository.getWithFlaggableMessages(guildID, userID);

            expect(entity).toBeNull();
        });
    });

    describe("getWithMessages", () => {
        it("should retrieve the profile record for the specified user", async () => {
            vi.mocked(prisma.profile.findUnique).mockResolvedValue(mockProfile);

            const entity = await repository.getWithMessages(guildID, userID);

            expect(entity).toEqual(mockProfile);
            expect(prisma.profile.findUnique).toHaveBeenCalledOnce();
            expect(prisma.profile.findUnique).toHaveBeenCalledWith({
                include: {
                    messages: {
                        where: { guildID }
                    }
                },
                where: { userID }
            });
        });

        it("should return null when no profile record is found", async () => {
            vi.mocked(prisma.profile.findUnique).mockResolvedValue(null);

            const entity = await repository.getWithMessages(guildID, userID);

            expect(entity).toBeNull();
        });
    });

    describe("upsert", () => {
        it("should upsert the provided profile record", async () => {
            await repository.upsert(userID, {
                contact: "Send me a direct message"
            });

            expect(prisma.profile.upsert).toHaveBeenCalledOnce();
            expect(prisma.profile.upsert).toHaveBeenCalledWith({
                create: {
                    about: "",
                    contact: "Send me a direct message",
                    userID: userID
                },
                update: {
                    contact: "Send me a direct message"
                },
                where: { userID }
            });
        });
    });
});
