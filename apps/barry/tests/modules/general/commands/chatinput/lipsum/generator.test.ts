import {
    generateParagraphs,
    generateSentences,
    generateWords
} from "../../../../../../src/modules/general/commands/chatinput/lipsum/generator.js";

describe("generator", () => {
    describe("generateParagraphs", () => {
        it("should generate text with the specified amount of paragraphs", () => {
            const count = 4;
            const text = generateParagraphs(count);
            const paragraphs = text.split("\n\n");

            expect(paragraphs.length).toBe(count);
        });
    });

    describe("generateSentences", () => {
        it("should generate a paragraph with the specified amount of sentences", () => {
            const count = 6;
            const paragraph = generateSentences(count);
            const sentences = paragraph.split(". ");

            expect(sentences.length).toBe(count);
        });

        it("should generate multiple paragraphs if there are too many sentences", () => {
            const count = 20;
            const text = generateSentences(count);
            const paragraphs = text.split("\n\n");
            const sentences = paragraphs.join(" ").split(". ");

            expect(sentences.length).toBe(20);
            expect(paragraphs.length).toBeGreaterThan(1);
        });
    });

    describe("generateWords", () => {
        it("should generate a sentence with the specified amount of words", () => {
            const count = 10;
            const sentence = generateWords(count);
            const words = sentence.split(" ");

            expect(words.length).toBe(count);
        });

        it("should end a sentence with a period", () => {
            const count = 10;
            const sentence = generateWords(count);

            expect(sentence.endsWith(".")).toBe(true);
        });

        it("should generate multiple sentences if there are too many words", () => {
            const count = 50;
            const paragraph = generateWords(count);
            const sentences = paragraph.split(". ");
            const words = paragraph.split(" ");

            expect(words.length).toBe(count);
            expect(sentences.length).toBeGreaterThan(1);
        });

        it("should generate multiple paragraphs if there are too many sentences", () => {
            const count = 500;
            const text = generateWords(count);

            const paragraphs = text.split("\n\n");
            const sentences = paragraphs.join(" ").split(". ");
            const words = sentences.join(" ").split(" ");

            expect(words.length).toBe(count);
            expect(sentences.length).toBeGreaterThan(1);
            expect(paragraphs.length).toBeGreaterThan(1);
        });
    });
});
