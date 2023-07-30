import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockApplicationCommandInteraction, mockUser } from "@barry/testing";

import { ApplicationCommandInteraction } from "@barry/core";
import { MessageFlags } from "@discordjs/core";
import { createMockApplication } from "../../../../../mocks/index.js";

import GeneralModule from "../../../../../../src/modules/general/index.js";
import ReverseCommand from "../../../../../../src/modules/general/commands/user/reverse/index.js";

describe("Reverse Search Avatar", () => {
    let command: ReverseCommand;
    let interaction: ApplicationCommandInteraction;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new GeneralModule(client);
        command = new ReverseCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, command.client, vi.fn());
        interaction.createMessage = vi.fn();
    });

    it("should send an error message if the user has no avatar", async () => {
        await command.execute(interaction, {
            user: { ...mockUser, avatar: null }
        });

        expect(interaction.createMessage).toHaveBeenCalledOnce();
        expect(interaction.createMessage).toHaveBeenCalledWith({
            content: expect.stringContaining("This user does not have an avatar."),
            flags: MessageFlags.Ephemeral
        });
    });

    it("should send the reverse search results if the user does have an avatar", async () => {
        await command.execute(interaction, {
            user: mockUser
        });

        expect(interaction.createMessage).toHaveBeenCalledOnce();
        expect(interaction.createMessage).toHaveBeenCalledWith({
            embeds: [
                expect.objectContaining({
                    description: expect.stringContaining("**Google Lens**"),
                    image: {
                        url: `https://cdn.discordapp.com/avatars/${mockUser.id}/${mockUser.avatar}.webp?size=1024`
                    }
                })
            ],
            flags: MessageFlags.Ephemeral
        });
    });
});
