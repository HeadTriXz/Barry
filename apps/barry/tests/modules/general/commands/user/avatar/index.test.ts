import { createMockApplicationCommandInteraction, mockUser } from "@barry-bot/testing";

import { ApplicationCommandInteraction } from "@barry-bot/core";
import { createMockApplication } from "../../../../../mocks/index.js";

import AvatarCommand from "../../../../../../src/modules/general/commands/user/avatar/index.js";
import GeneralModule from "../../../../../../src/modules/general/index.js";

describe("View Avatar", () => {
    let command: AvatarCommand;
    let interaction: ApplicationCommandInteraction;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new GeneralModule(client);
        command = new AvatarCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client);
        interaction.createMessage = vi.fn();
    });

    describe("execute", () => {
        it("should send the avatar of the user", async () => {
            await command.execute(interaction, {
                user: mockUser
            });

            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                embeds: [
                    expect.objectContaining({
                        image: {
                            url: `https://cdn.discordapp.com/avatars/${mockUser.id}/${mockUser.avatar}.webp?size=1024`
                        }
                    })
                ]
            });
        });

        it("should send the default avatar of the user if the user has no avatar set", async () => {
            await command.execute(interaction, {
                user: { ...mockUser, avatar: null }
            });

            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                embeds: [
                    expect.objectContaining({
                        image: {
                            url: expect.stringMatching(/https:\/\/cdn\.discordapp\.com\/embed\/avatars\/[0-5]\.png/)
                        }
                    })
                ]
            });
        });
    });
});
