import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationCommandInteraction } from "@barry/core";
import { createMockApplicationCommandInteraction } from "@barry/testing";
import { createMockApplication } from "../../../../../mocks/index.js";

import * as generator from "../../../../../../src/modules/general/commands/chatinput/lipsum/generator.js";

import GeneralModule from "../../../../../../src/modules/general/index.js";
import LipsumCommand from "../../../../../../src/modules/general/commands/chatinput/lipsum/index.js";

describe("/lipsum", () => {
    let command: LipsumCommand;
    let interaction: ApplicationCommandInteraction;

    beforeEach(() => {
        const client = createMockApplication();

        const module = new GeneralModule(client);
        command = new LipsumCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client);
        interaction.createMessage = vi.fn();
    });

    describe("execute", () => {
        it("should send a response based on the 'words' option", async () => {
            const generateSpy = vi.spyOn(generator, "generateWords");
            await command.execute(interaction, {
                words: 10
            });

            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                content: generateSpy.mock.results[0].value
            });
        });

        it("should send a response based on the 'sentences' option", async () => {
            const generateSpy = vi.spyOn(generator, "generateSentences");
            await command.execute(interaction, {
                sentences: 5
            });

            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                content: generateSpy.mock.results[0].value
            });
        });

        it("should send a response based on the 'paragraphs' option", async () => {
            const generateSpy = vi.spyOn(generator, "generateParagraphs");
            await command.execute(interaction, {
                paragraphs: 3
            });

            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                content: generateSpy.mock.results[0].value
            });
        });

        it("should send the response as a file if the content exceeds the character limit", async () => {
            const generateSpy = vi.spyOn(generator, "generateParagraphs");
            await command.execute(interaction, {
                paragraphs: 15
            });

            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                content: expect.stringContaining("I couldn't fit everything in one message, so I sent it as a file instead:"),
                files: [{
                    data: generateSpy.mock.results[0].value,
                    name: "lipsum.txt"
                }]
            });
        });

        it("should return a single paragraph if no options are provided", async () => {
            const generateSpy = vi.spyOn(generator, "generateParagraphs");
            await command.execute(interaction, {});

            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                content: generateSpy.mock.results[0].value
            });
        });

        it("should prefer 'paragraphs' over 'sentences'", async () => {
            const generateSpy = vi.spyOn(generator, "generateParagraphs");
            await command.execute(interaction, {
                paragraphs: 3,
                sentences: 5
            });

            expect(generateSpy).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                content: generateSpy.mock.results[0].value
            });
        });

        it("should prefer 'sentences' over 'words'", async () => {
            const generateSpy = vi.spyOn(generator, "generateSentences");
            await command.execute(interaction, {
                sentences: 5,
                words: 10
            });

            expect(generateSpy).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                content: generateSpy.mock.results[0].value
            });
        });
    });
});
