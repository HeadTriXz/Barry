import { type APIModalSubmitInteraction, ComponentType } from "@discordjs/core";

import { URL_REGEX, parseProfileData } from "../../../../../../src/modules/marketplace/dependencies/profiles/editor/functions/utils.js";
import { Application } from "../../../../../../src/Application.js";
import { ModalSubmitInteraction } from "@barry-bot/core";
import { createMockApplication } from "../../../../../mocks/application.js";
import { createMockModalSubmitInteraction } from "@barry-bot/testing";

describe("Utils", () => {
    describe("URL_REGEX", () => {
        it("should match valid URLs", () => {
            expect(URL_REGEX.test("https://www.example.com")).toBe(true);
            expect(URL_REGEX.test("http://subdomain.example.co.uk")).toBe(true);
            expect(URL_REGEX.test("https://www.example.com/path/to/page")).toBe(true);
            expect(URL_REGEX.test("https://www.example.com/path/to/page?query=param")).toBe(true);
            expect(URL_REGEX.test("https://www.example.com/path/to/page?query=param&another=true")).toBe(true);
            expect(URL_REGEX.test("https://example.com")).toBe(true);
            expect(URL_REGEX.test("https://example.co.uk")).toBe(true);
        });

        it("should not match invalid URLs", () => {
            expect(URL_REGEX.test("ftp://www.example.com")).toBe(false);
            expect(URL_REGEX.test("http:/example.com")).toBe(false);
            expect(URL_REGEX.test("ttps://www.example.com")).toBe(false);
            expect(URL_REGEX.test("https://www.example.com/pa th")).toBe(false);
            expect(URL_REGEX.test("https://www.example.com/pa th?query=param")).toBe(false);
            expect(URL_REGEX.test("https://localhost")).toBe(false);
            expect(URL_REGEX.test("https://google")).toBe(false);
            expect(URL_REGEX.test(".com")).toBe(false);
        });
    });

    describe("parseProfileData", () => {
        let client: Application;
        let data: APIModalSubmitInteraction;

        beforeEach(() => {
            client = createMockApplication();
            data = createMockModalSubmitInteraction({
                components: [
                    {
                        components: [{
                            custom_id: "about",
                            type: ComponentType.TextInput,
                            value: "hello world. foo bar!"
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "links",
                            type: ComponentType.TextInput,
                            value: "https://github.com/HeadTriXz\nexample.com"
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "location",
                            type: ComponentType.TextInput,
                            value: "san francisco, CA"
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "pricing",
                            type: ComponentType.TextInput,
                            value: "starting from $50"
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "skills",
                            type: ComponentType.TextInput,
                            value: "logo design, icon design, 3D design"
                        }],
                        type: ComponentType.ActionRow
                    }
                ],
                custom_id: "modal"
            });
        });

        it("should correctly format the profile data", async () => {
            const interaction = new ModalSubmitInteraction(data, client);

            const result = await parseProfileData(interaction);

            expect(result).toEqual({
                about: "Hello world. Foo bar!",
                links: ["https://github.com/HeadTriXz", "https://example.com/"],
                location: "San Francisco, CA",
                pricing: "Starting from $50",
                skills: ["Logo Design", "Icon Design", "3D Design"]
            });
        });

        it("should split links that are separated with commas", async () => {
            data.data.components[1].components[0].value = "example.com, another.example.com, foo.bar.com";
            const interaction = new ModalSubmitInteraction(data, client);

            const result = await parseProfileData(interaction);

            expect(result).toEqual({
                about: "Hello world. Foo bar!",
                links: ["https://example.com/", "https://another.example.com/", "https://foo.bar.com/"],
                location: "San Francisco, CA",
                pricing: "Starting from $50",
                skills: ["Logo Design", "Icon Design", "3D Design"]
            });
        });

        it("should split links that are separated with newlines", async () => {
            data.data.components[1].components[0].value = "example.com\nanother.example.com\nfoo.bar.com";
            const interaction = new ModalSubmitInteraction(data, client);

            const result = await parseProfileData(interaction);

            expect(result).toEqual({
                about: "Hello world. Foo bar!",
                links: ["https://example.com/", "https://another.example.com/", "https://foo.bar.com/"],
                location: "San Francisco, CA",
                pricing: "Starting from $50",
                skills: ["Logo Design", "Icon Design", "3D Design"]
            });
        });

        it("should split skills that are separated with commas", async () => {
            data.data.components[4].components[0].value = "Logo Design, Icon Design, 3D Design";
            const interaction = new ModalSubmitInteraction(data, client);

            const result = await parseProfileData(interaction);

            expect(result).toEqual({
                about: "Hello world. Foo bar!",
                links: ["https://github.com/HeadTriXz", "https://example.com/"],
                location: "San Francisco, CA",
                pricing: "Starting from $50",
                skills: ["Logo Design", "Icon Design", "3D Design"]
            });
        });

        it("should split skills that are separated with newlines", async () => {
            data.data.components[4].components[0].value = "Logo Design\nIcon Design\n3D Design";
            const interaction = new ModalSubmitInteraction(data, client);

            const result = await parseProfileData(interaction);

            expect(result).toEqual({
                about: "Hello world. Foo bar!",
                links: ["https://github.com/HeadTriXz", "https://example.com/"],
                location: "San Francisco, CA",
                pricing: "Starting from $50",
                skills: ["Logo Design", "Icon Design", "3D Design"]
            });
        });

        it("should ignore invalid links", async () => {
            data.data.components[1].components[0].value = "example.com\ninvalid-link\nftp://invalid-link.com\nhttps://google.c[o]m";
            const interaction = new ModalSubmitInteraction(data, client);

            const result = await parseProfileData(interaction);

            expect(result).toEqual({
                about: "Hello world. Foo bar!",
                links: ["https://example.com/"],
                location: "San Francisco, CA",
                pricing: "Starting from $50",
                skills: ["Logo Design", "Icon Design", "3D Design"]
            });
        });

        describe("Invites", () => {
            it("should not allow invite links in the about me section", async () => {
                data.data.components[0].components[0].value = "Hello world! discord.gg/invite";
                const interaction = new ModalSubmitInteraction(data, client, vi.fn());

                const result = await parseProfileData(interaction);

                expect(result).toBeUndefined();
            });

            it("should not allow invite links in the links section", async () => {
                data.data.components[1].components[0].value = "discord.gg/invite";
                const interaction = new ModalSubmitInteraction(data, client, vi.fn());

                const result = await parseProfileData(interaction);

                expect(result).toBeUndefined();
            });

            it("should not allow invite links in the location section", async () => {
                data.data.components[2].components[0].value = "discord.gg/invite";
                const interaction = new ModalSubmitInteraction(data, client, vi.fn());

                const result = await parseProfileData(interaction);

                expect(result).toBeUndefined();
            });

            it("should not allow invite links in the pricing section", async () => {
                data.data.components[3].components[0].value = "discord.gg/invite";
                const interaction = new ModalSubmitInteraction(data, client, vi.fn());

                const result = await parseProfileData(interaction);

                expect(result).toBeUndefined();
            });

            it("should not allow invite links in the skills section", async () => {
                data.data.components[4].components[0].value = "example.com\ndiscord.gg/invite";
                const interaction = new ModalSubmitInteraction(data, client, vi.fn());

                const result = await parseProfileData(interaction);

                expect(result).toBeUndefined();
            });
        });
    });
});
