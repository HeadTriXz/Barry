import {
    type APIAttachment,
    type APIInteractionResponseCallbackData,
    MessageFlags
} from "@discordjs/core";
import {
    type ApplicationCommandInteraction,
    type MessageCommandTarget,
    MessageCommand
} from "@barry/core";

import type GeneralModule from "../../../index.js";
import config from "../../../../../config.js";

const GOOGLE_LENS = "https://lens.google.com/uploadbyurl?url=";
const YANDEX = "https://yandex.com/images/touch/search?rpt=imageview&url=";
const BING = "https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIVSP&sbisrc=UrlPaste&q=imgurl:";
const TINEYE = "https://www.tineye.com/search/?url=";

export default class extends MessageCommand<GeneralModule> {
    constructor(module: GeneralModule) {
        super(module, {
            name: "Reverse Search Image"
        });
    }

    async execute(interaction: ApplicationCommandInteraction, { message }: MessageCommandTarget): Promise<void> {
        const attachments = message.attachments.filter((a) => a.content_type?.startsWith("image"));
        if (attachments.length === 0) {
            return interaction.createMessage({
                content: `${config.emotes.error} Could not find any images in this message.`,
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.createMessage(this.#getContent(attachments[0]));
    }

    #getContent(attachment: APIAttachment): APIInteractionResponseCallbackData {
        const url = encodeURIComponent(attachment.url);

        const google = `[${config.emotes.check} **Google Lens**](${GOOGLE_LENS + url})`;
        const yandex = `[${config.emotes.check} **Yandex**](${YANDEX + url})`;
        const bing = `[${config.emotes.check} **Bing**](${BING + url})`;
        const tinEye = `[${config.emotes.check} **TinEye**](${TINEYE + url})`;

        return {
            embeds: [{
                color: config.defaultColor,
                description: `${google}\n${yandex}\n${bing}\n${tinEye}\n\n**Original image:**`,
                image: {
                    url: attachment.url
                }
            }],
            flags: MessageFlags.Ephemeral
        };
    }
}
