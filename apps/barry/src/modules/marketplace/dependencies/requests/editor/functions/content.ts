import {
    type APIEmbedField,
    type APIInteractionResponseCallbackData,
    type APIModalInteractionResponseCallbackData,
    type APIUser,
    ComponentType,
    TextInputStyle
} from "@discordjs/core";
import { type Request, type RequestsSettings, RequestStatus } from "@prisma/client";
import type { RequestWithAttachments } from "../../database.js";

import { getAvatarURL } from "@barry/core";
import config from "../../../../../../config.js";

/**
 * Represents the status messages for a request.
 */
const statuses: Partial<Record<RequestStatus, string>> = {
    [RequestStatus.Available]: `${config.emotes.available} Available`,
    [RequestStatus.Taken]: `${config.emotes.busy} Taken`,
    [RequestStatus.Finished]: `${config.emotes.unavailable} Finished`
};

/**
 * Generates the content for the 'editContact' message.
 *
 * @param request The request to generate the content for.
 * @returns The content for the 'editContact' message.
 */
export function getEditContactContent(request?: Request): APIModalInteractionResponseCallbackData {
    return {
        components: [{
            components: [{
                custom_id: "contact",
                label: "How should people reach out to you?",
                max_length: 100,
                placeholder: "e.g., 'Send me a direct message', 'Email me at hello@example.com', etc.",
                required: false,
                style: TextInputStyle.Short,
                type: ComponentType.TextInput,
                value: request?.contact || undefined
            }],
            type: ComponentType.ActionRow
        }],
        custom_id: `${Date.now()}_create_request_2`,
        title: "Contact Information"
    };
}

/**
 * Generates the content for the 'editRequest' message.
 *
 * @param request The request to generate the content for.
 * @returns The content for the 'editRequest' message.
 */
export function getEditRequestContent(
    settings: RequestsSettings,
    request?: Request
): APIModalInteractionResponseCallbackData {
    return {
        components: [
            {
                components: [{
                    custom_id: "title",
                    label: "Job Title",
                    max_length: 50,
                    min_length: 5,
                    placeholder: "e.g. Web Developer, Graphic Designer, etc.",
                    style: TextInputStyle.Short,
                    type: ComponentType.TextInput,
                    value: request?.title
                }],
                type: ComponentType.ActionRow
            },
            {
                components: [{
                    custom_id: "description",
                    label: "Description",
                    max_length: 1000,
                    min_length: 100,
                    placeholder: "Describe the job you're looking to get done, provide as much detail as possible.",
                    style: TextInputStyle.Paragraph,
                    type: ComponentType.TextInput,
                    value: request?.description
                }],
                type: ComponentType.ActionRow
            },
            {
                components: [{
                    custom_id: "compensation",
                    label: "Compensation",
                    max_length: 100,
                    placeholder: `e.g. $${settings.minCompensation}, $${settings.minCompensation}/hour, etc.`,
                    style: TextInputStyle.Short,
                    type: ComponentType.TextInput,
                    value: request?.compensation
                }],
                type: ComponentType.ActionRow
            },
            {
                components: [{
                    custom_id: "location",
                    label: "Location",
                    max_length: 100,
                    placeholder: "e.g. Remote, San Francisco, etc.",
                    required: false,
                    style: TextInputStyle.Short,
                    type: ComponentType.TextInput,
                    value: request?.location || undefined
                }],
                type: ComponentType.ActionRow
            },
            {
                components: [{
                    custom_id: "deadline",
                    label: "Deadline",
                    max_length: 100,
                    placeholder: "e.g. January 1, 2023",
                    required: false,
                    style: TextInputStyle.Short,
                    type: ComponentType.TextInput,
                    value: request?.deadline || undefined
                }],
                type: ComponentType.ActionRow
            }
        ],
        custom_id: `${Date.now()}_create_request_1`,
        title: "Create a request"
    };
}

/**
 * Generates the content for a request.
 *
 * @param user The user that posted the request.
 * @param request The request to generate the content for.
 * @returns The content for the request.
 */
export function getRequestContent(user: APIUser, request: RequestWithAttachments): APIInteractionResponseCallbackData {
    const fields: APIEmbedField[] = [{
        name: "Description",
        value: request.description
    }];

    if (request.location !== null) {
        fields.push({
            inline: true,
            name: "Location",
            value: request.location
        });
    }

    fields.push({
        inline: true,
        name: "Compensation",
        value: request.compensation
    });

    if (request.deadline !== null) {
        fields.push({
            name: "Deadline",
            value: request.deadline
        });
    }

    const status = statuses[request.status] || statuses[RequestStatus.Available];
    const content: APIInteractionResponseCallbackData = {
        content: `<@${request.userID}>`,
        embeds: [{
            color: config.embedColor,
            description: `**Job \`${request.id}\` posted by <@${request.userID}>**\n${status}\n\u200B`,
            fields: fields,
            thumbnail: {
                url: getAvatarURL(user)
            },
            title: request.title
        }]
    };

    if (request.attachments.length > 0) {
        const index = request.attachments.findIndex((a) => a.contentType.startsWith("image"));
        if (index !== -1) {
            content.embeds![0].image = {
                url: request.attachments[index].url
            };
        }

        const otherAttachments = request.attachments
            .filter((a, i) => index !== i)
            .map((a) => `[${a.name}](${a.url})`)
            .join(", ");

        fields.push({
            name: "Attachments",
            value: index !== -1
                ? `${otherAttachments}\n\n\`${request.attachments[index].name}\`:`
                : otherAttachments
        });
    }

    return content;
}
