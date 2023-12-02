import { type CaseLogOptions, getLogContent } from "../../../../src/modules/moderation/functions/getLogContent.js";

import { mockGuild, mockUser } from "@barry-bot/testing";
import { CaseType } from "@prisma/client";
import { getAvatarURL } from "@barry-bot/core";

describe("getLogContent", () => {
    let options: CaseLogOptions;

    beforeEach(() => {
        options = {
            case: {
                createdAt: new Date("1-1-2023"),
                creatorID: mockUser.id,
                guildID: mockGuild.id,
                id: 34,
                type: CaseType.Kick,
                userID: "257522665437265920"
            },
            creator: mockUser,
            reason: "Rude!",
            user: mockUser
        };
    });

    it("should generate the correct content for a log message", () => {
        const content = getLogContent(options);

        expect(content).toEqual({
            embeds: [{
                author: {
                    name: mockUser.username,
                    icon_url: getAvatarURL(mockUser)
                },
                color: expect.any(Number),
                description: `**Target:** <@${mockUser.id}> \`${mockUser.username}\`\n` +
                    `**Creator:** <@${mockUser.id}> \`${mockUser.username}\``,
                fields: [{
                    name: "**Note**",
                    value: "Rude!"
                }],
                footer: {
                    text: `User ID: ${mockUser.id}`
                },
                timestamp: new Date("1-1-2023").toISOString(),
                title: expect.stringContaining("Kick | Case #34")
            }]
        });
    });

    it("should generate the correct content for a log message with a duration", () => {
        options.duration = 60 * 60 * 24 * 7;
        const content = getLogContent(options);
        const expiresAt = Math.trunc((options.case.createdAt.getTime() / 1000) + options.duration);

        expect(content).toEqual({
            embeds: [{
                author: {
                    name: mockUser.username,
                    icon_url: getAvatarURL(mockUser)
                },
                color: expect.any(Number),
                description: `**Target:** <@${mockUser.id}> \`${mockUser.username}\`\n` +
                    `**Creator:** <@${mockUser.id}> \`${mockUser.username}\``,
                fields: [
                    {
                        name: "**Note**",
                        value: "Rude!"
                    },
                    {
                        name: "**Duration**",
                        value: `Expires <t:${expiresAt}:R>`
                    }
                ],
                footer: {
                    text: `User ID: ${mockUser.id}`
                },
                timestamp: new Date("1-1-2023").toISOString(),
                title: expect.stringContaining("Kick | Case #34")
            }]
        });
    });
});
