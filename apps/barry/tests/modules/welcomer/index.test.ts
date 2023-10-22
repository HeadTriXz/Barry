import type { WelcomerSettings } from "@prisma/client";
import { type Canvas, loadImage } from "canvas-constructor/napi-rs";

import { createMockModalSubmitInteraction, mockGuild, mockUser } from "@barry/testing";
import { WelcomerSettingsRepository } from "../../../src/modules/welcomer/database/index.js";
import { createMockApplication } from "../../mocks/application.js";
import { ModalSubmitInteraction, UpdatableInteraction, getAvatarURL } from "@barry/core";

import WelcomerModule from "../../../src/modules/welcomer/index.js";
import { ComponentType, MessageFlags } from "@discordjs/core";
import { timeoutContent } from "../../../src/common.js";

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

    describe("handleColor", () => {
        let interaction: UpdatableInteraction;
        let response: ModalSubmitInteraction;

        beforeEach(() => {
            vi.useFakeTimers().setSystemTime("01-01-2023");

            const data = createMockModalSubmitInteraction();
            interaction = new UpdatableInteraction(data, module.client, vi.fn());
            interaction.createModal = vi.fn();
            interaction.editParent = vi.fn();

            const responseData = createMockModalSubmitInteraction({
                components: [{
                    components: [{
                        custom_id: "color",
                        type: ComponentType.TextInput,
                        value: "FF0000"
                    }],
                    type: ComponentType.ActionRow
                }],
                custom_id: `config-color-${Date.now()}`
            });
            response = new ModalSubmitInteraction(responseData, module.client, vi.fn());
            response.createMessage = vi.fn();

            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(response);
        });

        it("should update the embed color if a valid color is provided", async () => {
            await module.handleColor(interaction, settings);

            expect(settings.embedColor).toBe(0xFF0000);
        });

        it("should show the original color if it exists", async () => {
            settings.embedColor = 0xFF0000;

            await module.handleColor(interaction, settings);

            expect(interaction.createModal).toHaveBeenCalledOnce();
            expect(interaction.createModal).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: [{
                        components: [
                            expect.objectContaining({
                                value: "#ff0000"
                            })
                        ],
                        type: ComponentType.ActionRow
                    }]
                })
            );
        });

        it("should remove the # from the color if provided", async () => {
            const responseData = createMockModalSubmitInteraction({
                components: [{
                    components: [{
                        custom_id: "color",
                        type: ComponentType.TextInput,
                        value: "#FF0000"
                    }],
                    type: ComponentType.ActionRow
                }],
                custom_id: `config-color-${Date.now()}`
            });
            response = new ModalSubmitInteraction(responseData, module.client, vi.fn());

            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(response);

            await module.handleColor(interaction, settings);

            expect(settings.embedColor).toBe(0xFF0000);
        });

        it("should return an error if an invalid color is provided", async () => {
            const responseData = createMockModalSubmitInteraction({
                components: [{
                    components: [{
                        custom_id: "color",
                        type: ComponentType.TextInput,
                        value: "invalid"
                    }],
                    type: ComponentType.ActionRow
                }],
                custom_id: `config-color-${Date.now()}`
            });
            response = new ModalSubmitInteraction(responseData, module.client, vi.fn());
            response.createMessage = vi.fn();

            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(response);

            await module.handleColor(interaction, settings);

            expect(response.createMessage).toHaveBeenCalledOnce();
            expect(response.createMessage).toHaveBeenCalledWith({
                content: expect.stringContaining("The color you entered is invalid."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should show a timeout message if the user does not respond", async () => {
            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(undefined);

            await module.handleColor(interaction, settings);

            expect(interaction.editParent).toHaveBeenCalledOnce();
            expect(interaction.editParent).toHaveBeenCalledWith(timeoutContent);
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
