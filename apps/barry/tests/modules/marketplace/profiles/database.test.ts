import type { ProfilesSettings } from "@prisma/client";

import {
    ProfileMessageRepository,
    ProfileRepository,
    ProfilesSettingsRepository
} from "../../../../src/modules/marketplace/dependencies/profiles/database.js";

import { mockChannel } from "@barry/testing";
import { mockProfile } from "./mocks/profile.js";
import { prisma } from "../../../mocks/index.js";

describe("ProfilesSettingsRepository", () => {
    const guildID = "68239102456844360";

    let repository: ProfilesSettingsRepository;
    let settings: ProfilesSettings;

    beforeEach(() => {
        repository = new ProfilesSettingsRepository(prisma);
        settings = {
            channelID: mockChannel.id,
            enabled: true,
            guildID: guildID,
            lastMessageID: null
        };
    });

    describe("create", () => {
        it("should create a new profiles settings record for the specified guild", async () => {
            await repository.create(guildID);

            expect(prisma.profilesSettings.create).toHaveBeenCalledOnce();
            expect(prisma.profilesSettings.create).toHaveBeenCalledWith({ data: { guildID } });
        });
    });

    describe("get", () => {
        it("should retrieve the profiles settings record for the specified guild", async () => {
            vi.mocked(prisma.profilesSettings.findUnique).mockResolvedValue(settings);

            const entity = await repository.get(guildID);

            expect(entity).toEqual(settings);
            expect(prisma.profilesSettings.findUnique).toHaveBeenCalledOnce();
            expect(prisma.profilesSettings.findUnique).toHaveBeenCalledWith({ where: { guildID } });
        });


        it("should return null when no profiles settings record is found", async () => {
            vi.mocked(prisma.profilesSettings.findUnique).mockResolvedValue(null);

            const entity = await repository.get(guildID);

            expect(entity).toBeNull();
        });
    });

    describe("getOrCreate", () => {
        it("should retrieve the profiles settings record if found", async () => {
            vi.mocked(prisma.profilesSettings.findUnique).mockResolvedValue(settings);

            const entity = await repository.getOrCreate(guildID);

            expect(entity).toEqual(settings);
            expect(prisma.profilesSettings.findUnique).toHaveBeenCalledOnce();
            expect(prisma.profilesSettings.create).not.toHaveBeenCalled();
        });

        it("should create a new profiles settings record if not found", async () => {
            vi.mocked(prisma.profilesSettings.findUnique).mockResolvedValue(null);
            vi.mocked(prisma.profilesSettings.create).mockResolvedValue(settings);

            const entity = await repository.getOrCreate(guildID);

            expect(entity).toEqual(settings);
            expect(prisma.profilesSettings.findUnique).toHaveBeenCalledOnce();
            expect(prisma.profilesSettings.create).toHaveBeenCalledOnce();
        });
    });

    describe("upsert", () => {
        it("should upsert the provided profiles settings record", async () => {
            await repository.upsert(guildID, {
                lastMessageID: "91256340920236565"
            });

            expect(prisma.profilesSettings.upsert).toHaveBeenCalledOnce();
            expect(prisma.profilesSettings.upsert).toHaveBeenCalledWith({
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
