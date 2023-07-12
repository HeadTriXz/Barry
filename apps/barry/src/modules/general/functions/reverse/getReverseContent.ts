import {
    type APIAttachment,
    type APIInteractionResponseCallbackData,
    MessageFlags
} from "@discordjs/core";

import config from "../../../../config.js";

/**
 * Base URL for Google Lens search results.
 */
const GOOGLE_LENS = "https://lens.google.com/uploadbyurl?url=";

/**
 * Base URL for Yandex search results.
 */
const YANDEX = "https://yandex.com/images/touch/search?rpt=imageview&url=";

/**
 * Base URL for Bing search results.
 */
const BING = "https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIVSP&sbisrc=UrlPaste&q=imgurl:";

/**
 * Returns the content for the reverse search result.
 *
 * @param attachments An array of the found attachments.
 * @param index The index of the selected attachment.
 * @returns The search results.
 */
export function getReverseContent(attachments: APIAttachment[], index: number = 0): APIInteractionResponseCallbackData {
    const selected = attachments[index];
    const encodedURL = encodeURIComponent(selected.url);

    const results = `${config.emotes.googleLens} [**Google Lens**](${GOOGLE_LENS + encodedURL})\n`
        + `${config.emotes.yandex} [**Yandex**](${YANDEX + encodedURL})\n`
        + `${config.emotes.bing} [**Bing**](${BING + encodedURL})\n`;

    let images = "";
    if (attachments.length > 1) {
        images += "### Found Images\n";
        for (let i = 0; i < attachments.length; i++) {
            if (i === index) {
                images += `${i + 1}. **[${attachments[i].filename} (selected)](${attachments[i].url})**\n`;
            } else {
                images += `${i + 1}. [${attachments[i].filename}](${attachments[i].url})\n`;
            }
        }
    }

    return {
        embeds: [{
            color: config.defaultColor,
            description: `${results}${images}### Selected Image`,
            image: {
                url: selected.url
            }
        }],
        flags: MessageFlags.Ephemeral
    };
}

/**
 * Returns the content for the reverse search result of a user's avatar.
 *
 * @param avatarURL The URL of the avatar to reverse search.
 * @returns The search results.
 */
export function getReverseAvatarContent(avatarURL: string): APIInteractionResponseCallbackData {
    const encodedURL = encodeURIComponent(avatarURL);

    const results = `${config.emotes.googleLens} [**Google Lens**](${GOOGLE_LENS + encodedURL})\n`
        + `${config.emotes.yandex} [**Yandex**](${YANDEX + encodedURL})\n`
        + `${config.emotes.bing} [**Bing**](${BING + encodedURL})\n`;

    return {
        embeds: [{
            color: config.defaultColor,
            description: `${results}### Selected Image`,
            image: {
                url: avatarURL
            }
        }],
        flags: MessageFlags.Ephemeral
    };
}
