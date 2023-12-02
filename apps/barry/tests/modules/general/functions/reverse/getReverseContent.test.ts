import { MessageFlags } from "@discordjs/core";
import { getReverseContent } from "../../../../../src/modules/general/functions/reverse/getReverseContent.js";
import { mockAttachment } from "@barry-bot/testing";

import config from "../../../../../src/config.js";

describe("getReverseContent", () => {
    it("should return the correct content for a single attachment", () => {
        const content = getReverseContent([mockAttachment]);

        expect(content).toEqual({
            embeds: [{
                color: expect.any(Number),
                description: `${config.emotes.googleLens} [**Google Lens**](https://lens.google.com/uploadbyurl?url=${encodeURIComponent(mockAttachment.url)})\n`
                    + `${config.emotes.yandex} [**Yandex**](https://yandex.com/images/touch/search?rpt=imageview&url=${encodeURIComponent(mockAttachment.url)})\n`
                    + `${config.emotes.bing} [**Bing**](https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIVSP&sbisrc=UrlPaste&q=imgurl:${encodeURIComponent(mockAttachment.url)})\n`
                    + "### Selected Image",
                image: {
                    url: mockAttachment.url
                }
            }],
            flags: expect.any(Number)
        });
    });

    it("should return the correct content for multiple attachments", () => {
        const content = getReverseContent([mockAttachment, mockAttachment, mockAttachment], 1);

        expect(content).toEqual({
            embeds: [{
                color: expect.any(Number),
                description: `${config.emotes.googleLens} [**Google Lens**](https://lens.google.com/uploadbyurl?url=${encodeURIComponent(mockAttachment.url)})\n`
                    + `${config.emotes.yandex} [**Yandex**](https://yandex.com/images/touch/search?rpt=imageview&url=${encodeURIComponent(mockAttachment.url)})\n`
                    + `${config.emotes.bing} [**Bing**](https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIVSP&sbisrc=UrlPaste&q=imgurl:${encodeURIComponent(mockAttachment.url)})\n`
                    + "### Found Images\n"
                    + `1. [${mockAttachment.filename}](${mockAttachment.url})\n`
                    + `2. **[${mockAttachment.filename} (selected)](${mockAttachment.url})**\n`
                    + `3. [${mockAttachment.filename}](${mockAttachment.url})\n`
                    + "### Selected Image",
                image: {
                    url: mockAttachment.url
                }
            }],
            flags: MessageFlags.Ephemeral
        });
    });
});
