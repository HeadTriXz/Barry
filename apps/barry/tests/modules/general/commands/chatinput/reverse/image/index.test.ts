import { createMockApplicationCommandInteraction, mockAttachment } from "@barry-bot/testing";

import { ApplicationCommandInteraction } from "@barry-bot/core";
import { MessageFlags } from "@discordjs/core";
import { createMockApplication } from "../../../../../../mocks/index.js";

import GeneralModule from "../../../../../../../src/modules/general/index.js";
import ReverseImageCommand from "../../../../../../../src/modules/general/commands/chatinput/reverse/image/index.js";

describe("Reverse Search Image", () => {
    let command: ReverseImageCommand;
    let interaction: ApplicationCommandInteraction;

    beforeEach(() => {
        const client = createMockApplication();

        const module = new GeneralModule(client);
        command = new ReverseImageCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, command.client, vi.fn());
        interaction.createMessage = vi.fn();
    });

    it("should send an error message if the provided attachment is not an image", async () => {
        await command.execute(interaction, {
            image: { ...mockAttachment, content_type: "text/plain" }
        });

        expect(interaction.createMessage).toHaveBeenCalledOnce();
        expect(interaction.createMessage).toHaveBeenCalledWith({
            content: expect.stringContaining("That is not a valid image."),
            flags: MessageFlags.Ephemeral
        });
    });

    it("should send the reverse search results if a valid image is provided", async () => {
        await command.execute(interaction, {
            image: mockAttachment
        });

        expect(interaction.createMessage).toHaveBeenCalledOnce();
        expect(interaction.createMessage).toHaveBeenCalledWith({
            embeds: [
                expect.objectContaining({
                    description: expect.stringContaining("**Google Lens**"),
                    image: {
                        url: mockAttachment.url
                    }
                })
            ],
            flags: MessageFlags.Ephemeral
        });
    });
});
