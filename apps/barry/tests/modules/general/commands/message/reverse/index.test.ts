import { ComponentType, MessageFlags } from "@discordjs/core";
import {
    createMockApplicationCommandInteraction,
    mockAttachment,
    mockMessage
} from "@barry/testing";

import { ApplicationCommandInteraction } from "@barry/core";
import { createMockApplication } from "../../../../../mocks/index.js";

import GeneralModule from "../../../../../../src/modules/general/index.js";
import ReverseCommand from "../../../../../../src/modules/general/commands/message/reverse/index.js";

describe("Reverse Search Image", () => {
    let command: ReverseCommand;
    let interaction: ApplicationCommandInteraction;

    beforeEach(() => {
        const client = createMockApplication();

        const module = new GeneralModule(client);
        command = new ReverseCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, command.client, vi.fn());
    });

    it("should send an error message if no images are found in the message", async () => {
        interaction.createMessage = vi.fn();

        await command.execute(interaction, {
            message: mockMessage
        });

        expect(interaction.createMessage).toHaveBeenCalledOnce();
        expect(interaction.createMessage).toHaveBeenCalledWith({
            content: expect.stringContaining("Could not find any images in this message."),
            flags: MessageFlags.Ephemeral
        });
    });

    it("should send the reverse search results if an image is found", async () => {
        interaction.editOriginalMessage = vi.fn();

        await command.execute(interaction, {
            message: { ...mockMessage, attachments: [mockAttachment] }
        });

        expect(interaction.editOriginalMessage).toHaveBeenCalledOnce();
        expect(interaction.editOriginalMessage).toHaveBeenCalledWith({
            content: "",
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

    it("should modify the pagination buttons", async () => {
        interaction.editOriginalMessage = vi.fn();
        vi.useFakeTimers();
        vi.runAllTimersAsync();

        await command.execute(interaction, {
            message: { ...mockMessage, attachments: [mockAttachment, mockAttachment] }
        });

        expect(interaction.editOriginalMessage).toHaveBeenCalledTimes(2);
        expect(interaction.editOriginalMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                components: [{
                    components: [
                        expect.objectContaining({
                            label: "Previous Image"
                        }),
                        expect.objectContaining({
                            label: "Next Image"
                        })
                    ],
                    type: ComponentType.ActionRow
                }]
            })
        );
    });
});
