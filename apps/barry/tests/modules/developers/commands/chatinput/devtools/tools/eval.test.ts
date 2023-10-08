import { ModalSubmitInteraction, UpdatableInteraction } from "@barry/core";
import {
    createMockMessageComponentInteraction,
    createMockModalSubmitInteraction
} from "@barry/testing";

import { ComponentType } from "@discordjs/core";
import { createMockApplication } from "../../../../../../mocks/application.js";
import { evaluate } from "../../../../../../../src/modules/developers/commands/chatinput/devtools/tools/index.js";
import { timeoutContent } from "../../../../../../../src/common.js";

import vm from "node:vm";

describe("evaluate", () => {
    let interaction: UpdatableInteraction;
    let response: ModalSubmitInteraction;

    beforeEach(() => {
        vi.useFakeTimers().setSystemTime("01-01-2023");

        const client = createMockApplication();
        const data = createMockMessageComponentInteraction();
        interaction = new UpdatableInteraction(data, client, vi.fn());
        interaction.editParent = vi.fn();

        const responseData = createMockModalSubmitInteraction({
            components: [{
                components: [{
                    custom_id: "code",
                    type: ComponentType.TextInput,
                    value: "1 + 1"
                }],
                type: ComponentType.ActionRow
            }],
            custom_id: `eval-${Date.now()}`
        });
        response = new ModalSubmitInteraction(responseData, client, vi.fn());
        response.editParent = vi.fn();

        vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(response);
    });

    it("should evaluate the code", async () => {
        vi.spyOn(vm, "runInNewContext").mockResolvedValue(2);

        await evaluate(interaction);

        expect(vm.runInNewContext).toHaveBeenCalledOnce();
        expect(vm.runInNewContext).toHaveBeenCalledWith("1 + 1");
        expect(response.editParent).toHaveBeenCalledOnce();
        expect(response.editParent).toHaveBeenCalledWith({
            components: [],
            content: "",
            embeds: [{
                color: expect.any(Number),
                description: expect.stringContaining("Finished evaluating in 0ms."),
                fields: [
                    {
                        name: "**Code**",
                        value: "```\n1 + 1\n```"
                    },
                    {
                        name: "**Result**",
                        value: "```\n2\n```"
                    }
                ],
                title: "Evaluation"
            }]
        });
    });

    it("should show an error message if the code throws an error", async () => {
        const error = new Error("Oh no!");
        vi.spyOn(vm, "runInNewContext").mockRejectedValue(error);

        await evaluate(interaction);

        expect(response.editParent).toHaveBeenCalledOnce();
        expect(response.editParent).toHaveBeenCalledWith({
            components: [],
            content: "",
            embeds: [{
                color: expect.any(Number),
                description: expect.stringContaining("Finished evaluating in 0ms."),
                fields: [
                    {
                        name: "**Code**",
                        value: "```\n1 + 1\n```"
                    },
                    {
                        name: "**Error**",
                        value: `\`\`\`\n${error.stack}\n\`\`\``
                    }
                ],
                title: "Evaluation"
            }]
        });
    });

    it("should show the whole error if it is not an instance of Error", async () => {
        const error = "Oh no!";
        vi.spyOn(vm, "runInNewContext").mockRejectedValue(error);

        await evaluate(interaction);

        expect(response.editParent).toHaveBeenCalledOnce();
        expect(response.editParent).toHaveBeenCalledWith({
            components: [],
            content: "",
            embeds: [{
                color: expect.any(Number),
                description: expect.stringContaining("Finished evaluating in 0ms."),
                fields: [
                    {
                        name: "**Code**",
                        value: "```\n1 + 1\n```"
                    },
                    {
                        name: "**Error**",
                        value: `\`\`\`\n${error}\n\`\`\``
                    }
                ],
                title: "Evaluation"
            }]
        });
    });

    it("should show a timeout message if the user does not respond", async () => {
        vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(undefined);

        await evaluate(interaction);

        expect(interaction.editParent).toHaveBeenCalledOnce();
        expect(interaction.editParent).toHaveBeenCalledWith(timeoutContent);
    });
});
