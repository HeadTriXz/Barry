import { LIPSUM_WORDS } from "./words.js";
import { capitalize } from "../../../../../utils/index.js";

/**
 * The probability of adding a comma to a sentence.
 */
const COMMA_PROBABILITY = 0.3;

/**
 * The maximum number of words per sentence.
 */
const MAX_WORDS_PER_SENTENCE = 18;

/**
 * The minimum number of words per sentence.
 */
const MIN_WORDS_PER_SENTENCE = 5;

/**
 * The maximum number of sentences per paragraph.
 */
const MAX_SENTENCES_PER_PARAGRAPH = 7;

/**
 * The minimum number of sentences per paragraph.
 */
const MIN_SENTENCES_PER_PARAGRAPH = 3;

/**
 * Generates a random lorem ipsum word.
 *
 * @returns A random word.
 */
function generateRandomWord(): string {
    return LIPSUM_WORDS[generateRandomInt(LIPSUM_WORDS.length)];
}

/**
 * Generates a random integer within the specified boundaries.
 *
 * @param max The maximum value.
 * @param min The minimum value.
 * @returns A random integer between min and max.
 */
function generateRandomInt(max: number, min: number = 0): number {
    return min + Math.trunc(Math.random() * (max - min));
}

/**
 * Joins multiple sentences into randomly sized paragraphs.
 *
 * @param sentences The sentences to join.
 * @returns The generated text.
 */
function joinParagraphs(sentences: string[]): string {
    if (sentences.length <= MAX_SENTENCES_PER_PARAGRAPH) {
        return sentences.join(" ");
    }

    const paragraphs: string[] = [];
    while (sentences.length > 0) {
        const randomParagraphLength = generateRandomInt(MAX_SENTENCES_PER_PARAGRAPH, MIN_SENTENCES_PER_PARAGRAPH);
        const paragraphLength = Math.min(sentences.length, randomParagraphLength);

        const paragraph = sentences.splice(0, paragraphLength).join(" ");

        paragraphs.push(paragraph);
    }

    return paragraphs.join("\n\n");
}

/**
 * Generates a signle lorem ipsum sentence with a specified number of words.
 *
 * @param count The amount of words to generate.
 * @returns The generated sentence.
 */
function generateSingleSentence(words: number): string {
    const result = Array.from({ length: words }, generateRandomWord);

    if (words > 2 && Math.random() <= COMMA_PROBABILITY) {
        const index = generateRandomInt(words - 2);
        result[index] += ",";
    }

    return capitalize(result.join(" ")) + ".";
}

/**
 * Generates a random lorem ipsum sentence with a specified number of words.
 *
 * @param count The amount of words to generate.
 * @returns The generated sentence.
 */
export function generateWords(count: number): string {
    if (count <= MAX_WORDS_PER_SENTENCE) {
        return generateSingleSentence(count);
    }

    const sentences: string[] = [];
    while (count > 0) {
        const randomSentenceLength = generateRandomInt(MAX_WORDS_PER_SENTENCE, MIN_WORDS_PER_SENTENCE);
        const sentenceLength = Math.min(count, randomSentenceLength);

        sentences.push(generateSingleSentence(sentenceLength));

        count -= sentenceLength;
    }

    return joinParagraphs(sentences);
}

/**
 * Generates a random lorem ipsum paragraph with a specified number of sentences.
 *
 * @param count The amount of sentences to generate.
 * @returns The generated paragraph.
 */
export function generateSentences(count: number): string {
    const sentences = Array.from({ length: count }, () => {
        return generateWords(generateRandomInt(MAX_WORDS_PER_SENTENCE, MIN_WORDS_PER_SENTENCE));
    });

    return joinParagraphs(sentences);
}

/**
 * Generates a random lorem ipsum text with a specified number of paragraphs.
 *
 * @param count The amount of paragraphs to generate.
 * @returns The generated text.
 */
export function generateParagraphs(count: number): string {
    const result = Array.from({ length: count }, () => {
        return generateSentences(generateRandomInt(MAX_SENTENCES_PER_PARAGRAPH, MIN_SENTENCES_PER_PARAGRAPH));
    });

    return result.join("\n\n");
}
