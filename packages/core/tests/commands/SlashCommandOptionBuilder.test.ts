import {
    type Client,
    AutocompleteInteraction,
    SlashCommandOptionBuilder
} from "../../src/index.js";

import { ApplicationCommandOptionType, ChannelType } from "@discordjs/core";
import { createMockAutocompleteInteraction } from "@barry/testing";

describe("SlashCommandOptionBuilder", () => {
    describe("attachments", () => {
        it("should create options for a slash command with the 'attachment' type", () => {
            const result = SlashCommandOptionBuilder.attachments({
                description: "Lorem ipsum dolor sit amet."
            });

            expect(result.type).toBe(ApplicationCommandOptionType.Attachment);
        });
    });

    describe("boolean", () => {
        it("should create options for a slash command with the 'boolean' type", () => {
            const result = SlashCommandOptionBuilder.boolean({
                description: "Lorem ipsum dolor sit amet."
            });

            expect(result.type).toBe(ApplicationCommandOptionType.Boolean);
        });
    });

    describe("channel", () => {
        it("should create options for a slash command with the 'channel' type", () => {
            const result = SlashCommandOptionBuilder.channel({
                description: "Lorem ipsum dolor sit amet.",
                channelTypes: [ChannelType.GuildText]
            });

            expect(result.type).toBe(ApplicationCommandOptionType.Channel);
            expect(result.channel_types).toEqual([ChannelType.GuildText]);
        });
    });

    describe("integer", () => {
        it("should create options for a slash command with the 'integer' type", () => {
            const result = SlashCommandOptionBuilder.integer({
                description: "Lorem ipsum dolor sit amet.",
                maximum: 10,
                minimum: 0
            });

            expect(result.type).toBe(ApplicationCommandOptionType.Integer);
            expect(result.max_value).toBe(10);
            expect(result.min_value).toBe(0);
        });

        it("should create options for a slash command with autocomplete", () => {
            const interaction = new AutocompleteInteraction(createMockAutocompleteInteraction(), {} as Client);
            const result = SlashCommandOptionBuilder.integer({
                autocomplete: () => [{
                    name: "foo",
                    value: 123
                }],
                description: "Lorem ipsum dolor sit amet."
            });

            expect(result.type).toBe(ApplicationCommandOptionType.Integer);
            expect(result.autocomplete?.(123, interaction)).toEqual([{
                name: "foo",
                value: 123
            }]);
        });

        it("should create options for a slash command with choices", () => {
            const result = SlashCommandOptionBuilder.integer({
                choices: [{
                    name: "foo",
                    value: 123
                }],
                description: "Lorem ipsum dolor sit amet."
            });

            expect(result.type).toBe(ApplicationCommandOptionType.Integer);
            expect(result.choices).toEqual([{
                name: "foo",
                value: 123
            }]);
        });

        it("should throw an error when autocomplete and choices are both provided", () => {
            expect(() => {
                SlashCommandOptionBuilder.integer({
                    autocomplete: () => [{
                        name: "foo",
                        value: 123
                    }],
                    choices: [{
                        name: "foo",
                        value: 123
                    }] as never,
                    description: "Lorem ipsum dolor sit amet.",
                    maximum: 10,
                    minimum: 0
                });
            }).toThrowError("\"autocomplete\" may not be set if \"choices\" is present.");
        });
    });

    describe("member", () => {
        it("should create options for a slash command with the 'user' type and isMember flag", () => {
            const result = SlashCommandOptionBuilder.member({
                description: "Lorem ipsum dolor sit amet."
            });

            expect(result.type).toBe(ApplicationCommandOptionType.User);
            expect(result.isMember).toBe(true);
        });
    });

    describe("mentionable", () => {
        it("should create options for a slash command with the 'mentionable' type", () => {
            const result = SlashCommandOptionBuilder.mentionable({
                description: "Lorem ipsum dolor sit amet."
            });

            expect(result.type).toBe(ApplicationCommandOptionType.Mentionable);
        });
    });

    describe("number", () => {
        it("should create options for a slash command with the 'number' type", () => {
            const result = SlashCommandOptionBuilder.number({
                description: "Lorem ipsum dolor sit amet.",
                maximum: 10,
                minimum: 0
            });

            expect(result.type).toBe(ApplicationCommandOptionType.Number);
            expect(result.max_value).toBe(10);
            expect(result.min_value).toBe(0);
        });

        it("should create options for a slash command with autocomplete", () => {
            const interaction = new AutocompleteInteraction(createMockAutocompleteInteraction(), {} as Client);
            const result = SlashCommandOptionBuilder.number({
                autocomplete: () => [{
                    name: "foo",
                    value: 123
                }],
                description: "Lorem ipsum dolor sit amet."
            });

            expect(result.type).toBe(ApplicationCommandOptionType.Number);
            expect(result.autocomplete?.(123, interaction)).toEqual([{
                name: "foo",
                value: 123
            }]);
        });

        it("should create options for a slash command with choices", () => {
            const result = SlashCommandOptionBuilder.number({
                choices: [{
                    name: "foo",
                    value: 123
                }],
                description: "Lorem ipsum dolor sit amet."
            });

            expect(result.type).toBe(ApplicationCommandOptionType.Number);
            expect(result.choices).toEqual([{
                name: "foo",
                value: 123
            }]);
        });


        it("should throw an error when autocomplete and choices are both provided", () => {
            expect(() => {
                SlashCommandOptionBuilder.number({
                    autocomplete: () => [{
                        name: "foo",
                        value: 123
                    }],
                    choices: [{
                        name: "foo",
                        value: 123
                    }] as never,
                    description: "Lorem ipsum dolor sit amet.",
                    maximum: 10,
                    minimum: 0
                });
            }).toThrowError("\"autocomplete\" may not be set if \"choices\" is present.");
        });
    });

    describe("role", () => {
        it("should create options for a slash command with the 'role' type", () => {
            const result = SlashCommandOptionBuilder.role({
                description: "Lorem ipsum dolor sit amet."
            });

            expect(result.type).toBe(ApplicationCommandOptionType.Role);
        });
    });

    describe("string", () => {
        it("should create options for a slash command with the 'string' type", () => {
            const result = SlashCommandOptionBuilder.string({
                description: "Lorem ipsum dolor sit amet.",
                maximum: 50,
                minimum: 1
            });

            expect(result.type).toBe(ApplicationCommandOptionType.String);
            expect(result.max_length).toBe(50);
            expect(result.min_length).toBe(1);
        });

        it("should create options for a slash command with autocomplete", () => {
            const interaction = new AutocompleteInteraction(createMockAutocompleteInteraction(), {} as Client);
            const result = SlashCommandOptionBuilder.string({
                autocomplete: () => [{
                    name: "foo",
                    value: "bar"
                }],
                description: "Lorem ipsum dolor sit amet."
            });

            expect(result.type).toBe(ApplicationCommandOptionType.String);
            expect(result.autocomplete?.("foo", interaction)).toEqual([{
                name: "foo",
                value: "bar"
            }]);
        });

        it("should create options for a slash command with choices", () => {
            const result = SlashCommandOptionBuilder.string({
                choices: [{
                    name: "foo",
                    value: "bar"
                }],
                description: "Lorem ipsum dolor sit amet."
            });

            expect(result.type).toBe(ApplicationCommandOptionType.String);
            expect(result.choices).toEqual([{
                name: "foo",
                value: "bar"
            }]);
        });

        it("should throw an error when 'autocomplete' and 'choices' are both provided", () => {
            expect(() => {
                SlashCommandOptionBuilder.string({
                    autocomplete: () => [{
                        name: "foo",
                        value: "bar"
                    }],
                    choices: [{
                        name: "foo",
                        value: "bar"
                    }] as never,
                    description: "Lorem ipsum dolor sit amet.",
                    maximum: 50,
                    minimum: 1
                });
            }).toThrowError("\"autocomplete\" may not be set if \"choices\" is present.");
        });
    });

    describe("user", () => {
        it("should create options for a slash command with the 'user' type", () => {
            const result = SlashCommandOptionBuilder.user({
                description: "Lorem ipsum dolor sit amet."
            });

            expect(result.type).toBe(ApplicationCommandOptionType.User);
            expect(result.isMember).toBeFalsy();
        });
    });
});
