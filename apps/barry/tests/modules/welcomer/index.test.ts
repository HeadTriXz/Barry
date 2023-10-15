import type { WelcomerSettings } from "@prisma/client";
import { type Canvas, loadImage } from "canvas-constructor/napi-rs";

import { mockGuild, mockUser } from "@barry/testing";
import { WelcomerSettingsRepository } from "../../../src/modules/welcomer/database/index.js";
import { createMockApplication } from "../../mocks/application.js";
import { getAvatarURL } from "@barry/core";

import WelcomerModule from "../../../src/modules/welcomer/index.js";

vi.mock("canvas-constructor/napi-rs", () => {
    const image = Buffer.from("Hello World!");
    const MockCanvas: typeof Canvas = vi.fn();
    MockCanvas.prototype.printImage = vi.fn().mockReturnThis();
    MockCanvas.prototype.printCircularImage = vi.fn().mockReturnThis();
    MockCanvas.prototype.pngAsync = vi.fn().mockResolvedValue(image);

    return {
        Canvas: MockCanvas,
        loadImage: vi.fn().mockResolvedValue(image)
    };
});

describe("WelcomerModule", () => {
    let module: WelcomerModule;
    let settings: WelcomerSettings;

    beforeEach(() => {
        const client = createMockApplication();
        module = new WelcomerModule(client);

        settings = {
            channelID: "30527482987641765",
            content: "Welcome {user.name} to {guild.name}!",
            embedAuthor: null,
            embedAuthorIcon: null,
            embedColor: null,
            embedDescription: null,
            embedFooter: null,
            embedFooterIcon: null,
            embedImage: null,
            embedThumbnail: null,
            embedTimestamp: false,
            embedTitle: null,
            enabled: true,
            guildID: mockGuild.id,
            withImage: false
        };

        vi.spyOn(module.settings, "getOrCreate").mockResolvedValue(settings);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("constructor", () => {
        it("should set up the settings repository correctly", () => {
            expect(module.settings).toBeInstanceOf(WelcomerSettingsRepository);
        });
    });

    describe("createImage", () => {
        it("should create the image for the welcome message", async () => {
            const buffer = await module.createImage(mockUser);

            expect(buffer).toBeInstanceOf(Buffer);
            expect(buffer.toString()).toBe("Hello World!");
        });

        it("should cache the background image", async () => {
            await module.createImage(mockUser);
            await module.createImage(mockUser);

            expect(loadImage).toHaveBeenCalledTimes(3);
        });
    });

    describe("getContent", () => {
        beforeEach(() => {
            vi.spyOn(module.client.api.guilds, "get").mockResolvedValue(mockGuild);
        });

        it("should return the configured content", async () => {
            const content = await module.getContent(mockUser, settings);

            expect(content).toEqual({
                content: `Welcome ${mockUser.username} to ${mockGuild.name}!`
            });
        });

        it("should add the configured author to the embed", async () => {
            settings.embedAuthor = "Hello World";

            const content = await module.getContent(mockUser, settings);

            expect(content).toEqual({
                content: `Welcome ${mockUser.username} to ${mockGuild.name}!`,
                embeds: [{
                    author: {
                        name: "Hello World"
                    }
                }]
            });
        });

        it("should add the configured author icon to the embed", async () => {
            settings.embedAuthorIcon = "https://example.com/avatar.png";

            const content = await module.getContent(mockUser, settings);

            expect(content).toEqual({
                content: `Welcome ${mockUser.username} to ${mockGuild.name}!`,
                embeds: [{
                    author: {
                        icon_url: "https://example.com/avatar.png",
                        name: "\u200B"
                    }
                }]
            });
        });

        it("should add the configured description to the embed", async () => {
            settings.embedDescription = "Hello World";

            const content = await module.getContent(mockUser, settings);

            expect(content).toEqual({
                content: `Welcome ${mockUser.username} to ${mockGuild.name}!`,
                embeds: [{
                    description: "Hello World"
                }]
            });
        });

        it("should add the configured color to the embed", async () => {
            settings.embedColor = 0xFF0000;
            settings.embedDescription = "Hello World";

            const content = await module.getContent(mockUser, settings);

            expect(content).toEqual({
                content: `Welcome ${mockUser.username} to ${mockGuild.name}!`,
                embeds: [{
                    color: 0xFF0000,
                    description: "Hello World"
                }]
            });
        });

        it("should not add the configured color to the embed if it has no content", async () => {
            settings.embedColor = 0xFF0000;

            const content = await module.getContent(mockUser, settings);

            expect(content).toEqual({
                content: `Welcome ${mockUser.username} to ${mockGuild.name}!`
            });
        });

        it("should add the configured footer to the embed", async () => {
            settings.embedFooter = "Hello World";

            const content = await module.getContent(mockUser, settings);

            expect(content).toEqual({
                content: `Welcome ${mockUser.username} to ${mockGuild.name}!`,
                embeds: [{
                    footer: {
                        text: "Hello World"
                    }
                }]
            });
        });

        it("should add the configured footer icon to the embed", async () => {
            settings.embedFooterIcon = "https://example.com/avatar.png";

            const content = await module.getContent(mockUser, settings);

            expect(content).toEqual({
                content: `Welcome ${mockUser.username} to ${mockGuild.name}!`,
                embeds: [{
                    footer: {
                        icon_url: "https://example.com/avatar.png",
                        text: "\u200B"
                    }
                }]
            });
        });

        it("should add the configured thumbnail to the embed", async () => {
            settings.embedThumbnail = "https://example.com/avatar.png";

            const content = await module.getContent(mockUser, settings);

            expect(content).toEqual({
                content: `Welcome ${mockUser.username} to ${mockGuild.name}!`,
                embeds: [{
                    thumbnail: {
                        url: "https://example.com/avatar.png"
                    }
                }]
            });
        });

        it("should add the configured title to the embed", async () => {
            settings.embedTitle = "Hello World";

            const content = await module.getContent(mockUser, settings);

            expect(content).toEqual({
                content: `Welcome ${mockUser.username} to ${mockGuild.name}!`,
                embeds: [{
                    title: "Hello World"
                }]
            });
        });

        it("should add a timestamp to the embed if configured", async () => {
            settings.embedDescription = "Hello World";
            settings.embedTimestamp = true;

            const content = await module.getContent(mockUser, settings);

            expect(content).toEqual({
                content: `Welcome ${mockUser.username} to ${mockGuild.name}!`,
                embeds: [{
                    description: "Hello World",
                    timestamp: expect.any(String)
                }]
            });
        });

        it("should add the configured image to the embed", async () => {
            settings.embedImage = "https://example.com/image.png";

            const content = await module.getContent(mockUser, settings);

            expect(content).toEqual({
                content: `Welcome ${mockUser.username} to ${mockGuild.name}!`,
                embeds: [{
                    image: {
                        url: "https://example.com/image.png"
                    }
                }]
            });
        });

        it("should generate a custom image if configured", async () => {
            const imageSpy = vi.spyOn(module, "createImage").mockResolvedValue(Buffer.from("Hello World!"));

            settings.embedDescription = "Hello World";
            settings.withImage = true;

            await module.getContent(mockUser, settings);

            expect(imageSpy).toHaveBeenCalledOnce();
            expect(imageSpy).toHaveBeenCalledWith(mockUser);
        });

        it("should add the generated image to the content if the embed is disabled", async () => {
            settings.withImage = true;

            const content = await module.getContent(mockUser, settings);

            expect(content).toEqual({
                attachments: [{
                    filename: "welcome.png",
                    id: "0"
                }],
                content: `Welcome ${mockUser.username} to ${mockGuild.name}!`,
                files: [{
                    data: Buffer.from("Hello World!"),
                    name: "welcome.png"
                }]
            });
        });

        it("should add the generated image to the embed if the embed is enabled", async () => {
            settings.embedDescription = "Hello World";
            settings.withImage = true;

            const content = await module.getContent(mockUser, settings);

            expect(content).toEqual({
                content: `Welcome ${mockUser.username} to ${mockGuild.name}!`,
                files: [{
                    name: "welcome.png",
                    data: Buffer.from("Hello World!")
                }],
                embeds: [{
                    description: "Hello World",
                    image: {
                        url: "attachment://welcome.png"
                    }
                }]
            });
        });

        it("should return the correct content with all settings enabled", async () => {
            settings.embedAuthor = "Hello World";
            settings.embedAuthorIcon = "https://example.com/avatar.png";
            settings.embedColor = 0xFF0000;
            settings.embedDescription = "Hello World";
            settings.embedFooter = "Hello World";
            settings.embedFooterIcon = "https://example.com/avatar.png";
            settings.embedImage = "https://example.com/image.png";
            settings.embedThumbnail = "https://example.com/avatar.png";
            settings.embedTimestamp = true;
            settings.embedTitle = "Hello World";
            settings.withImage = true;

            const content = await module.getContent(mockUser, settings);

            expect(content).toEqual({
                content: `Welcome ${mockUser.username} to ${mockGuild.name}!`,
                files: [{
                    data: Buffer.from("Hello World!"),
                    name: "welcome.png"
                }],
                embeds: [{
                    author: {
                        icon_url: "https://example.com/avatar.png",
                        name: "Hello World"
                    },
                    color: 0xFF0000,
                    description: "Hello World",
                    footer: {
                        icon_url: "https://example.com/avatar.png",
                        text: "Hello World"
                    },
                    image: {
                        url: "attachment://welcome.png"
                    },
                    thumbnail: {
                        url: "https://example.com/avatar.png"
                    },
                    timestamp: expect.any(String),
                    title: "Hello World"
                }]
            });
        });
    });

    describe("isEnabled", () => {
        it("should return true if the guild has the module enabled", async () => {
            settings.enabled = true;

            const enabled = await module.isEnabled(mockGuild.id);

            expect(enabled).toBe(true);
        });

        it("should return false if the guild has the module disabled", async () => {
            settings.enabled = false;

            const enabled = await module.isEnabled(mockGuild.id);

            expect(enabled).toBe(false);
        });
    });

    describe("replacePlaceholders", () => {
        it("should replace the {user.name} placeholders in the input string", () => {
            const result = module.replacePlaceholders("{user.name}", mockGuild, mockUser);

            expect(result).toBe(mockUser.username);
        });

        it("should replace the {user.mention} placeholders in the input string", () => {
            const result = module.replacePlaceholders("{user.mention}", mockGuild, mockUser);

            expect(result).toBe(`<@${mockUser.id}>`);
        });

        it("should replace the {user.avatar} placeholders in the input string", () => {
            const result = module.replacePlaceholders("{user.avatar}", mockGuild, mockUser);

            expect(result).toBe(getAvatarURL(mockUser));
        });

        it("should replace the {guild.name} placeholders in the input string", () => {
            const result = module.replacePlaceholders("{guild.name}", mockGuild, mockUser);

            expect(result).toBe(mockGuild.name);
        });

        it("should replace the {guild.icon} placeholders in the input string", () => {
            const result = module.replacePlaceholders("{guild.icon}", mockGuild, mockUser);

            expect(result).toContain("https://cdn.discordapp.com/icons");
        });

        it("should replace the {guild.icon} placeholders with an empty string if the guild has no icon", () => {
            const result = module.replacePlaceholders("{guild.icon}", { ...mockGuild, icon: null }, mockUser);

            expect(result).toBe("");
        });
    });
});
