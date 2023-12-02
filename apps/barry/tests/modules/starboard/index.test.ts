import { type APIAttachment, ButtonStyle, ComponentType } from "@discordjs/core";
import type { StarboardMessage, StarboardSettings } from "@prisma/client";

import { StarboardMessageRepository, StarboardSettingsRepository } from "../../../src/modules/starboard/database/index.js";
import { mockMember, mockMessage } from "@barry-bot/testing";
import { createMockApplication } from "../../mocks/application.js";

import StarboardModule, { type UpdateMessageOptions } from "../../../src/modules/starboard/index.js";

describe("StarboardModule", () => {
    let module: StarboardModule;
    let settings: StarboardSettings;

    beforeEach(() => {
        const client = createMockApplication();
        module = new StarboardModule(client);

        settings = {
            allowedChannels: [],
            allowedRoles: [],
            autoReactChannels: [],
            channelID: "76239102456844330",
            emojiID: null,
            emojiName: "\u2B50",
            enabled: true,
            guildID: "68239102456844360",
            ignoredChannels: [],
            ignoredRoles: [],
            threshold: 5
        };

        vi.spyOn(module.settings, "getOrCreate").mockResolvedValue(settings);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("constructor", () => {
        it("should set up the repositories correctly", () => {
            expect(module.messages).toBeInstanceOf(StarboardMessageRepository);
            expect(module.settings).toBeInstanceOf(StarboardSettingsRepository);
        });
    });

    describe("getContent", () => {
        let message: StarboardMessage;

        beforeEach(() => {
            vi.spyOn(module.client.api.channels, "getMessage").mockResolvedValue(mockMessage);
            vi.spyOn(module, "getStar").mockReturnValue("⭐");

            message = {
                authorID: "257522665437265920",
                channelID: "68239102456844360",
                crosspostID: null,
                guildID: "68239102456844360",
                messageID: "91256340920236565"
            };
        });

        it("should return the content of a message", async () => {
            const content = await module.getContent(message, 6);

            expect(content).toEqual({
                components: [{
                    components: [{
                        label: "Jump to Message",
                        style: ButtonStyle.Link,
                        type: ComponentType.Button,
                        url: `https://discord.com/channels/${message.guildID}/${message.channelID}/${message.messageID}`
                    }],
                    type: ComponentType.ActionRow
                }],
                content: `**⭐ 6** <#${message.channelID}>`,
                embeds: [{
                    author: {
                        name: mockMessage.author.username,
                        icon_url: expect.any(String)
                    },
                    description: mockMessage.content,
                    color: expect.any(Number)
                }]
            });
        });

        it("should include the image of the message if it has one", async () => {
            vi.spyOn(module, "getImage").mockReturnValue("https://foo.bar/image.png");

            const content = await module.getContent(message, 6);

            expect(content).toEqual({
                components: [{
                    components: [{
                        label: "Jump to Message",
                        style: ButtonStyle.Link,
                        type: ComponentType.Button,
                        url: `https://discord.com/channels/${message.guildID}/${message.channelID}/${message.messageID}`
                    }],
                    type: ComponentType.ActionRow
                }],
                content: `**⭐ 6** <#${message.channelID}>`,
                embeds: [{
                    author: {
                        name: mockMessage.author.username,
                        icon_url: expect.any(String)
                    },
                    color: expect.any(Number),
                    description: mockMessage.content,
                    image: {
                        url: "https://foo.bar/image.png"
                    }
                }]
            });
        });
    });

    describe("getImage", () => {
        it("should return the URL of the first image in a message", () => {
            const message = {
                ...mockMessage,
                attachments: [{ url: "https://foo.bar/image.png" } as APIAttachment],
                embeds: []
            };

            const url = module.getImage(message);

            expect(url).toBe("https://foo.bar/image.png");
        });

        it("should return the URL of the first image in an embed", () => {
            const message = {
                ...mockMessage,
                attachments: [],
                embeds: [{
                    image: { url: "https://foo.bar/image.png" }
                }]
            };

            const url = module.getImage(message);

            expect(url).toBe("https://foo.bar/image.png");
        });

        it("should return the URL of the first thumbnail in an embed", () => {
            const message = {
                ...mockMessage,
                attachments: [],
                embeds: [{
                    thumbnail: { url: "https://foo.bar/image.png" }
                }]
            };

            const url = module.getImage(message);

            expect(url).toBe("https://foo.bar/image.png");
        });
    });

    describe("getStar", () => {
        it("should return the correct star emoji for the given count", () => {
            expect(module.getStar(1)).toBe("⭐");
            expect(module.getStar(4)).toBe("⭐");
            expect(module.getStar(5)).toBe("🌟");
            expect(module.getStar(9)).toBe("🌟");
            expect(module.getStar(10)).toBe("💫");
            expect(module.getStar(19)).toBe("💫");
            expect(module.getStar(20)).toBe("✨");
            expect(module.getStar(49)).toBe("✨");
            expect(module.getStar(50)).toBe("🌠");
            expect(module.getStar(100)).toBe("🌠");
        });
    });

    describe("isEnabled", () => {
        it("should return true if the module is enabled", async () => {
            const enabled = await module.isEnabled(settings.guildID);

            expect(enabled).toBe(true);
        });

        it("should return false if the module is disabled", async () => {
            settings.enabled = false;

            const enabled = await module.isEnabled(settings.guildID);

            expect(enabled).toBe(false);
        });
    });

    describe("updateMessage", () => {
        let addOptions: UpdateMessageOptions;
        let removeOptions: UpdateMessageOptions;

        beforeEach(() => {
            removeOptions = {
                channelID: "68239102456844365",
                emoji: { id: null, name: "\u2B50" },
                guildID: "68239102456844360",
                messageID: "91256340920236565",
                userID: mockMember.user.id
            };

            addOptions = {
                ...removeOptions,
                authorID: "257522665437265920",
                member: mockMember
            };

            vi.spyOn(module, "getContent").mockResolvedValue({
                content: "Hello World!"
            });
            vi.spyOn(module.client.api.channels, "createMessage").mockResolvedValue(mockMessage);
            vi.spyOn(module.client.api.channels, "editMessage").mockResolvedValue(mockMessage);
            vi.spyOn(module.messages, "get").mockResolvedValue({
                authorID: "257522665437265920",
                channelID: "68239102456844360",
                crosspostID: "91256340920236560",
                guildID: "68239102456844360",
                messageID: "91256340920236565"
            });
            vi.spyOn(module.reactions, "getCount").mockResolvedValue(6);
        });

        describe("Updating", () => {
            it("should create a new reaction", async () => {
                vi.spyOn(module.reactions, "has").mockResolvedValue(false);
                const createSpy = vi.spyOn(module.reactions, "create").mockResolvedValue(undefined);

                await module.updateMessage(addOptions);

                expect(createSpy).toHaveBeenCalledOnce();
                expect(createSpy).toHaveBeenCalledWith(
                    addOptions.channelID,
                    addOptions.messageID,
                    addOptions.userID
                );
            });

            it("should delete an existing reaction", async () => {
                vi.spyOn(module.reactions, "has").mockResolvedValue(true);
                const deleteSpy = vi.spyOn(module.reactions, "delete").mockResolvedValue(undefined);

                await module.updateMessage(removeOptions);

                expect(deleteSpy).toHaveBeenCalledOnce();
                expect(deleteSpy).toHaveBeenCalledWith(
                    removeOptions.channelID,
                    removeOptions.messageID,
                    removeOptions.userID
                );
            });

            it("should create a new starboard message if one does not exist", async () => {
                vi.spyOn(module.messages, "get").mockResolvedValue(null);
                const createSpy = vi.spyOn(module.messages, "create").mockResolvedValue({
                    authorID: "257522665437265920",
                    channelID: "68239102456844360",
                    crosspostID: null,
                    guildID: "68239102456844360",
                    messageID: "91256340920236565"
                });

                await module.updateMessage(addOptions);

                expect(createSpy).toHaveBeenCalledOnce();
                expect(createSpy).toHaveBeenCalledWith({
                    authorID: addOptions.authorID,
                    channelID: addOptions.channelID,
                    guildID: addOptions.guildID,
                    messageID: addOptions.messageID
                });
            });

            it("should create a new message if one does not exist", async () => {
                vi.spyOn(module.reactions, "has").mockResolvedValue(false);
                vi.spyOn(module.messages, "get").mockResolvedValue({
                    authorID: "257522665437265920",
                    channelID: "68239102456844360",
                    crosspostID: null,
                    guildID: "68239102456844360",
                    messageID: "91256340920236565"
                });

                await module.updateMessage(addOptions);

                expect(module.client.api.channels.createMessage).toHaveBeenCalledOnce();
                expect(module.client.api.channels.createMessage).toHaveBeenCalledWith(settings.channelID, {
                    content: "Hello World!"
                });
            });

            it("should edit an existing message if one exists", async () => {
                vi.spyOn(module.reactions, "has").mockResolvedValue(false);

                await module.updateMessage(addOptions);

                expect(module.client.api.channels.editMessage).toHaveBeenCalledOnce();
                expect(module.client.api.channels.editMessage).toHaveBeenCalledWith(
                    settings.channelID,
                    "91256340920236560",
                    expect.any(Object)
                );
            });
        });

        describe("Validation", () => {
            it("should ignore if the module is disabled", async () => {
                settings.enabled = false;

                await module.updateMessage(addOptions);

                expect(module.messages.get).not.toHaveBeenCalled();
            });

            it("should ignore if the starboard channel is not set", async () => {
                settings.channelID = null;

                await module.updateMessage(addOptions);

                expect(module.messages.get).not.toHaveBeenCalled();
            });

            it("should ignore if the current channel is the starboard channel", async () => {
                settings.channelID = addOptions.channelID;

                await module.updateMessage(addOptions);

                expect(module.messages.get).not.toHaveBeenCalled();
            });

            describe("Reaction Added", () => {
                it("should ignore if the emoji is not the star emoji", async () => {
                    addOptions.emoji.name = "\u2728";

                    await module.updateMessage(addOptions);

                    expect(module.messages.get).not.toHaveBeenCalled();
                });

                it("should ignore if the channel is not in the allowed channels", async () => {
                    settings.allowedChannels = ["68239102456844361"];

                    await module.updateMessage(addOptions);

                    expect(module.messages.get).not.toHaveBeenCalled();
                });

                it("should ignore if the member does not have any allowed roles", async () => {
                    settings.allowedRoles = ["68239102456844361"];

                    await module.updateMessage(addOptions);

                    expect(module.messages.get).not.toHaveBeenCalled();
                });

                it("should ignore if the member is a bot", async () => {
                    addOptions.member = { ...mockMember, user: { ...mockMember.user, bot: true } };

                    await module.updateMessage(addOptions);

                    expect(module.messages.get).not.toHaveBeenCalled();
                });

                it("should ignore if the member is the author", async () => {
                    addOptions.member = { ...mockMember, user: { ...mockMember.user, id: addOptions.authorID! } };

                    await module.updateMessage(addOptions);

                    expect(module.messages.get).not.toHaveBeenCalled();
                });

                it("should ignore if the channel is ignored", async () => {
                    settings.ignoredChannels = [addOptions.channelID];

                    await module.updateMessage(addOptions);

                    expect(module.messages.get).not.toHaveBeenCalled();
                });

                it("should ignore if the member has an ignored role", async () => {
                    addOptions.member = { ...mockMember, roles: ["68239102456844361"] };
                    settings.ignoredRoles = ["68239102456844361"];

                    await module.updateMessage(addOptions);

                    expect(module.messages.get).not.toHaveBeenCalled();
                });

                it("should ignore if the member has already reacted", async () => {
                    const createSpy = vi.spyOn(module.reactions, "create").mockResolvedValue(undefined);
                    vi.spyOn(module.reactions, "has").mockResolvedValue(true);

                    await module.updateMessage(addOptions);

                    expect(createSpy).not.toHaveBeenCalled();
                });

                it("should not check the count if the message is new", async () => {
                    vi.spyOn(module.messages, "get").mockResolvedValue(null);
                    vi.spyOn(module.reactions, "has").mockResolvedValue(false);

                    await module.updateMessage(addOptions);

                    expect(module.reactions.getCount).not.toHaveBeenCalled();
                });
            });

            describe("Reaction Removed", () => {
                it("should ignore if no starboard message exists", async () => {
                    vi.spyOn(module.messages, "get").mockResolvedValue(null);

                    await module.updateMessage(removeOptions);

                    expect(module.reactions.getCount).not.toHaveBeenCalled();
                });

                it("should ignore if the member has not reacted", async () => {
                    const deleteSpy = vi.spyOn(module.reactions, "delete").mockResolvedValue(undefined);
                    vi.spyOn(module.reactions, "has").mockResolvedValue(false);

                    await module.updateMessage(removeOptions);

                    expect(deleteSpy).not.toHaveBeenCalled();
                });
            });
        });

        describe("Error Handling", () => {
            it("should log a warning if the user is not found", async () => {
                addOptions.member = { ...mockMember, user: undefined };

                await module.updateMessage(addOptions);

                expect(module.client.logger.warn).toHaveBeenCalledOnce();
                expect(module.client.logger.warn).toHaveBeenCalledWith("Missing 'user' on member object.");
            });
        });
    });
});
