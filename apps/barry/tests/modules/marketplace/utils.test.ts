import {
    capitalizeEachSentence,
    capitalizeEachWord,
    displayContact
} from "../../../src/modules/marketplace/utils.js";

import { MessageFlags } from "@discordjs/core";
import { UpdatableInteraction } from "@barry-bot/core";
import { createMockApplication } from "../../mocks/application.js";
import { createMockModalSubmitInteraction } from "@barry-bot/testing";
import { mockProfile } from "./profiles/mocks/profile.js";

describe("Utils", () => {
    describe("capitalizeEachSentence", () => {
        it("should capitalize each sentence in the string", () => {
            const input = "hello. this is a test! how are you?";
            const expected = "Hello. This is a test! How are you?";
            const result = capitalizeEachSentence(input);

            expect(result).toEqual(expected);
        });
    });

    describe("capitalizeEachWord", () => {
        it("should capitalize each word in the string", () => {
            const input = "hello world! this is a test.";
            const expected = "Hello World! This Is A Test.";

            const result = capitalizeEachWord(input);
            expect(result).toEqual(expected);
        });
    });

    describe("displayContact", () => {
        let interaction: UpdatableInteraction;

        beforeEach(() => {
            const client = createMockApplication();
            const data = createMockModalSubmitInteraction();

            interaction = new UpdatableInteraction(data, client, vi.fn());
            interaction.createMessage = vi.fn();
        });

        it("should send the contact information of the user", async () => {
            await displayContact(interaction, mockProfile);

            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                components: expect.any(Array),
                content: `<@${mockProfile.userID}> prefers to be contacted using the following information:\n\`\`\`\n${mockProfile.contact}\`\`\``,
                flags: MessageFlags.Ephemeral
            });
        });

        it("should send the default message if the user has no preferred method", async () => {
            const profile = { ...mockProfile, contact: null };

            await displayContact(interaction, profile);

            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                components: expect.any(Array),
                content: `<@${profile.userID}> hasn't provided any contact information. You can reach out to them by sending a direct message.`,
                flags: MessageFlags.Ephemeral
            });
        });
    });
});
