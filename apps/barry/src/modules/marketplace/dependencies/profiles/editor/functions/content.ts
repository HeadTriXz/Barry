import {
    type APIEmbedField,
    type APIInteractionResponseCallbackData,
    type APIModalInteractionResponseCallbackData,
    type APIUser,
    ComponentType,
    MessageFlags,
    TextInputStyle
} from "@discordjs/core";
import type { Profile } from "@prisma/client";

import {
    ProfileAvailability,
    combinations,
    getEmoji
} from "../availability.js";
import { getAvatarURL } from "@barry-bot/core";
import { parseLink } from "./parseLink.js";
import config from "../../../../../../config.js";

/**
 * Generates the content for the 'editAvailability' message.
 *
 * @param profile The profile of the user.
 * @returns The content for the 'editAvailability' message.
 */
export function getEditAvailabilityContent(profile?: Profile): APIInteractionResponseCallbackData {
    return {
        components: [{
            components: [{
                custom_id: "create_profile_2",
                options: [
                    {
                        label: combinations[ProfileAvailability.FullTime],
                        value: ProfileAvailability.FullTime.toString(),
                        default: profile !== undefined && profile.availability !== null
                            && (profile.availability & ProfileAvailability.FullTime) !== 0
                    },
                    {
                        label: combinations[ProfileAvailability.PartTime],
                        value: ProfileAvailability.PartTime.toString(),
                        default: profile !== undefined && profile.availability !== null
                            && (profile.availability & ProfileAvailability.PartTime) !== 0
                    },
                    {
                        label: combinations[ProfileAvailability.Freelance],
                        value: ProfileAvailability.Freelance.toString(),
                        default: profile !== undefined && profile.availability !== null
                            && (profile.availability & ProfileAvailability.Freelance) !== 0
                    },
                    {
                        label: combinations[ProfileAvailability.RemoteWork],
                        value: ProfileAvailability.RemoteWork.toString(),
                        default: profile !== undefined && profile.availability !== null
                            && (profile.availability & ProfileAvailability.RemoteWork) !== 0
                    },
                    {
                        label: combinations[ProfileAvailability.FlexibleHours],
                        value: ProfileAvailability.FlexibleHours.toString(),
                        default: profile !== undefined && profile.availability !== null
                            && (profile.availability & ProfileAvailability.FlexibleHours) !== 0
                    },
                    {
                        label: combinations[ProfileAvailability.CurrentlyBusy],
                        value: ProfileAvailability.CurrentlyBusy.toString(),
                        default: profile !== undefined && profile.availability !== null
                            && (profile.availability & ProfileAvailability.CurrentlyBusy) !== 0
                    },
                    {
                        label: combinations[ProfileAvailability.None],
                        value: ProfileAvailability.None.toString(),
                        default: profile !== undefined && profile.availability === 0
                    }
                ],
                max_values: 6,
                placeholder: "Select your availability",
                type: ComponentType.StringSelect
            }],
            type: ComponentType.ActionRow
        }],
        content: `### ${config.emotes.add} Please select your availability`,
        flags: MessageFlags.Ephemeral
    };
}

/**
 * Generates the content for the 'editContact' message.
 *
 * @param profile The profile of the user.
 * @returns The content for the 'editContact' message.
 */
export function getEditContactContent(profile?: Profile): APIModalInteractionResponseCallbackData {
    return {
        components: [{
            components: [{
                custom_id: "contact",
                label: "How should clients reach out to you?",
                max_length: 100,
                placeholder: "e.g., 'Send me a direct message', 'Email me at hello@example.com', etc.",
                required: false,
                style: TextInputStyle.Short,
                type: ComponentType.TextInput,
                value: profile?.contact || undefined
            }],
            type: ComponentType.ActionRow
        }],
        custom_id: `${Date.now()}_create_profile_3`,
        title: "Contact Information"
    };
}

/**
 * Generates the content for the 'editProfile' message.
 *
 * @param profile The profile of the user.
 * @returns The content for the 'editProfile' message.
 */
export function getEditProfileContent(profile?: Profile): APIModalInteractionResponseCallbackData {
    return {
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
                    value: profile?.about
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
                    value: profile?.skills.join(", ")
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
                    value: profile?.location || undefined
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
                    value: profile?.pricing || undefined
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
                    value: profile?.links.join("\n")
                }],
                type: ComponentType.ActionRow
            }
        ],
        custom_id: `${Date.now()}_create_profile_1`,
        title: "Create a profile"
    };
}

/**
 * Generates the content for a user's profile.
 *
 * @param user The user to view the profile of.
 * @param profile The profile of the user.
 * @returns The content of the profile.
 */
export function getProfileContent(user: APIUser, profile: Profile): APIInteractionResponseCallbackData {
    const fields: APIEmbedField[] = [{
        name: "About",
        value: profile.about
    }];

    if (profile.skills.length > 0) {
        fields.push({
            name: "Skills",
            value: `\`${profile.skills.map((skill) => skill.replaceAll("`", "'")).join("`, `")}\``
        });
    }

    if (profile.location !== null) {
        fields.push({
            inline: true,
            name: "Location",
            value: profile.location
        });
    }

    if (profile.pricing !== null) {
        fields.push({
            inline: true,
            name: "Pricing",
            value: profile.pricing
        });
    }

    if (profile.links.length > 0) {
        fields.push({
            name: "Links",
            value: profile.links
                .map((url) => {
                    const parsedLink = parseLink(url);
                    return `${parsedLink.platform}: [${parsedLink.username}](${url})`;
                })
                .join("\n")
        });
    }

    const content: APIInteractionResponseCallbackData = {
        content: `<@${profile.userID}>`,
        embeds: [{
            color: config.embedColor,
            description: profile.availability !== null
                ? `${getEmoji(profile.availability)} ${combinations[profile.availability]}\n\u200B`
                : "",
            fields: fields,
            thumbnail: {
                url: getAvatarURL(user)
            },
            title: user.global_name ?? user.username
        }]
    };

    if (profile.bannerURL !== null) {
        content.embeds![0].image = {
            url: profile.bannerURL
        };
    }

    return content;
}
