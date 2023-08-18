import { ComponentType, MessageFlags, TextInputStyle } from "@discordjs/core";
import { ProfileAvailability, combinations } from "../../../../../src/modules/marketplace/dependencies/profiles/editor/availability.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    getEditAvailabilityContent,
    getEditContactContent,
    getEditProfileContent,
    getProfileContent
} from "../../../../../src/modules/marketplace/dependencies/profiles/editor/content.js";
import { mockUser } from "@barry/testing";
import { mockProfile } from "../mocks/profile.js";

describe("Content", () => {
    describe("getEditAvailabilityContent", () => {
        it("should return the correct content for the editAvailability message", () => {
            const content = getEditAvailabilityContent();

            expect(content).toEqual({
                components: [{
                    components: [{
                        custom_id: "create_profile_2",
                        options: [
                            {
                                label: combinations[ProfileAvailability.FullTime],
                                value: ProfileAvailability.FullTime.toString(),
                                default: false
                            },
                            {
                                label: combinations[ProfileAvailability.PartTime],
                                value: ProfileAvailability.PartTime.toString(),
                                default: false
                            },
                            {
                                label: combinations[ProfileAvailability.Freelance],
                                value: ProfileAvailability.Freelance.toString(),
                                default: false
                            },
                            {
                                label: combinations[ProfileAvailability.RemoteWork],
                                value: ProfileAvailability.RemoteWork.toString(),
                                default: false
                            },
                            {
                                label: combinations[ProfileAvailability.FlexibleHours],
                                value: ProfileAvailability.FlexibleHours.toString(),
                                default: false
                            },
                            {
                                label: combinations[ProfileAvailability.CurrentlyBusy],
                                value: ProfileAvailability.CurrentlyBusy.toString(),
                                default: false
                            },
                            {
                                label: combinations[ProfileAvailability.None],
                                value: ProfileAvailability.None.toString(),
                                default: false
                            }
                        ],
                        max_values: 6,
                        placeholder: "Select your availability",
                        type: ComponentType.StringSelect
                    }],
                    type: ComponentType.ActionRow
                }],
                content: expect.stringContaining("Please select your availability"),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should set the correct default values if the profile is known", () => {
            const content = getEditAvailabilityContent(mockProfile);

            expect(content).toEqual({
                components: [{
                    components: [{
                        custom_id: "create_profile_2",
                        options: [
                            {
                                label: combinations[ProfileAvailability.FullTime],
                                value: ProfileAvailability.FullTime.toString(),
                                default: true
                            },
                            {
                                label: combinations[ProfileAvailability.PartTime],
                                value: ProfileAvailability.PartTime.toString(),
                                default: false
                            },
                            {
                                label: combinations[ProfileAvailability.Freelance],
                                value: ProfileAvailability.Freelance.toString(),
                                default: false
                            },
                            {
                                label: combinations[ProfileAvailability.RemoteWork],
                                value: ProfileAvailability.RemoteWork.toString(),
                                default: true
                            },
                            {
                                label: combinations[ProfileAvailability.FlexibleHours],
                                value: ProfileAvailability.FlexibleHours.toString(),
                                default: false
                            },
                            {
                                label: combinations[ProfileAvailability.CurrentlyBusy],
                                value: ProfileAvailability.CurrentlyBusy.toString(),
                                default: false
                            },
                            {
                                label: combinations[ProfileAvailability.None],
                                value: ProfileAvailability.None.toString(),
                                default: false
                            }
                        ],
                        max_values: 6,
                        placeholder: "Select your availability",
                        type: ComponentType.StringSelect
                    }],
                    type: ComponentType.ActionRow
                }],
                content: expect.stringContaining("Please select your availability"),
                flags: MessageFlags.Ephemeral
            });
        });
    });

    describe("getEditContactContent", () => {
        afterEach(() => {
            vi.useRealTimers();
        });

        it("should return the correct content for the editContact message", () => {
            vi.useFakeTimers().setSystemTime("2023-01-01");
            const content = getEditContactContent();

            expect(content).toEqual({
                components: [{
                    components: [{
                        custom_id: "contact",
                        label: "How should clients reach out to you?",
                        max_length: 100,
                        placeholder: "e.g., 'Send me a direct message', 'Email me at hello@example.com', etc.",
                        required: false,
                        style: TextInputStyle.Short,
                        type: ComponentType.TextInput
                    }],
                    type: ComponentType.ActionRow
                }],
                custom_id: `${Date.now()}_create_profile_3`,
                title: "Contact Information"
            });
        });

        it("should set the correct default value if the profile is known", () => {
            vi.useFakeTimers().setSystemTime("2023-01-01");
            const content = getEditContactContent(mockProfile);

            expect(content).toEqual({
                components: [{
                    components: [{
                        custom_id: "contact",
                        label: "How should clients reach out to you?",
                        max_length: 100,
                        placeholder: "e.g., 'Send me a direct message', 'Email me at hello@example.com', etc.",
                        required: false,
                        style: TextInputStyle.Short,
                        type: ComponentType.TextInput,
                        value: "Send me a direct message"
                    }],
                    type: ComponentType.ActionRow
                }],
                custom_id: `${Date.now()}_create_profile_3`,
                title: "Contact Information"
            });
        });
    });

    describe("getEditProfileContent", () => {
        afterEach(() => {
            vi.useRealTimers();
        });

        it("should return the correct content for the editContact message", () => {
            vi.useFakeTimers().setSystemTime("2023-01-01");
            const content = getEditProfileContent();

            expect(content).toEqual({
                components: [
                    {
                        components: [{
                            custom_id: "about",
                            label: "About",
                            max_length: 1000,
                            min_length: 100,
                            placeholder: "Tell us a bit about yourself, your background, interests, and goals.",
                            style: TextInputStyle.Paragraph,
                            type: ComponentType.TextInput
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "skills",
                            label: "Skills",
                            max_length: 1000,
                            placeholder: "Seperate skills with a comma (Logo Design, Icon Design, Poster Design) or a new line.",
                            required: false,
                            style: TextInputStyle.Paragraph,
                            type: ComponentType.TextInput
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "location",
                            label: "Location",
                            max_length: 100,
                            placeholder: "San Francisco, CA",
                            required: false,
                            style: TextInputStyle.Short,
                            type: ComponentType.TextInput
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "pricing",
                            label: "How much do you charge?",
                            max_length: 100,
                            placeholder: "e.g., 'Starting from $50', '$20/hour', 'Contact for pricing', etc.",
                            required: false,
                            style: TextInputStyle.Short,
                            type: ComponentType.TextInput
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "links",
                            label: "Links",
                            max_length: 500,
                            placeholder: "Seperate links with a comma (behance.net/barry, linkedin.com/in/barry) or a new line.",
                            required: false,
                            style: TextInputStyle.Paragraph,
                            type: ComponentType.TextInput
                        }],
                        type: ComponentType.ActionRow
                    }
                ],
                custom_id: `${Date.now()}_create_profile_1`,
                title: "Create a profile"
            });
        });

        it("should set the correct default value if the profile is known", () => {
            vi.useFakeTimers().setSystemTime("2023-01-01");
            const content = getEditProfileContent(mockProfile);

            expect(content).toEqual({
                components: [
                    {
                        components: [{
                            custom_id: "about",
                            label: "About",
                            max_length: 1000,
                            min_length: 100,
                            placeholder: "Tell us a bit about yourself, your background, interests, and goals.",
                            style: TextInputStyle.Paragraph,
                            type: ComponentType.TextInput,
                            value: mockProfile.about
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "skills",
                            label: "Skills",
                            max_length: 1000,
                            placeholder: "Seperate skills with a comma (Logo Design, Icon Design, Poster Design) or a new line.",
                            required: false,
                            style: TextInputStyle.Paragraph,
                            type: ComponentType.TextInput,
                            value: mockProfile.skills.join(", ")
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "location",
                            label: "Location",
                            max_length: 100,
                            placeholder: "San Francisco, CA",
                            required: false,
                            style: TextInputStyle.Short,
                            type: ComponentType.TextInput,
                            value: mockProfile.location
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "pricing",
                            label: "How much do you charge?",
                            max_length: 100,
                            placeholder: "e.g., 'Starting from $50', '$20/hour', 'Contact for pricing', etc.",
                            required: false,
                            style: TextInputStyle.Short,
                            type: ComponentType.TextInput,
                            value: mockProfile.pricing
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "links",
                            label: "Links",
                            max_length: 500,
                            placeholder: "Seperate links with a comma (behance.net/barry, linkedin.com/in/barry) or a new line.",
                            required: false,
                            style: TextInputStyle.Paragraph,
                            type: ComponentType.TextInput,
                            value: mockProfile.links.join("\n")
                        }],
                        type: ComponentType.ActionRow
                    }
                ],
                custom_id: `${Date.now()}_create_profile_1`,
                title: "Create a profile"
            });
        });
    });

    describe("getProfileContent", () => {
        it("should return the correct content for a profile with all fields", () => {
            const content = getProfileContent(mockUser, mockProfile);

            expect(content).toEqual({
                content: `<@${mockProfile.userID}>`,
                embeds: [{
                    title: mockUser.global_name,
                    color: expect.any(Number),
                    description: expect.stringContaining("Available for remote full-time positions"),
                    image: {
                        url: mockProfile.bannerURL
                    },
                    fields: [
                        {
                            name: "About",
                            value: "Hello world!"
                        },
                        {
                            name: "Skills",
                            value: "`Logo Design`, `Icon Design`, `Poster Design`"
                        },
                        {
                            inline: true,
                            name: "Location",
                            value: "San Francisco, CA"
                        },
                        {
                            inline: true,
                            name: "Pricing",
                            value: "Starting from $100"
                        },
                        {
                            name: "Links",
                            value: "Website: [example.com](https://example.com/)\nGitHub: [HeadTriXz](https://github.com/HeadTriXz)"
                        }
                    ],
                    thumbnail: {
                        url: `https://cdn.discordapp.com/avatars/${mockUser.id}/${mockUser.avatar}.webp`
                    }
                }]
            });
        });

        it("should return the correct content for a profile without optional fields", () => {
            const profile = {
                ...mockProfile,
                availability: null,
                bannerURL: null,
                links: [],
                location: null,
                pricing: null,
                skills: []
            };

            const content = getProfileContent({ ...mockUser, global_name: null }, profile);

            expect(content).toEqual({
                content: `<@${profile.userID}>`,
                embeds: [{
                    title: mockUser.username,
                    color: expect.any(Number),
                    description: "",
                    fields: [{
                        name: "About",
                        value: "Hello world!"
                    }],
                    thumbnail: {
                        url: `https://cdn.discordapp.com/avatars/${mockUser.id}/${mockUser.avatar}.webp`
                    }
                }]
            });
        });
    });
});
