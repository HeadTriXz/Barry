import type { UpdatableInteraction } from "@barry/core";

import { ComponentType, TextInputStyle } from "@discordjs/core";
import { timeoutContent } from "../../../../../../common.js";

import config from "../../../../../../config.js";
import vm from "node:vm";

/**
 * Evaluates JavaScript code.
 *
 * @param interaction The interaction that triggered the tool.
 */
export async function evaluate(interaction: UpdatableInteraction): Promise<void> {
    const key = `eval-${Date.now()}`;
    await interaction.createModal({
        title: "Eval",
        components: [{
            components: [{
                custom_id: "code",
                label: "Code",
                placeholder: "Enter the code you want to evaluate.",
                style: TextInputStyle.Paragraph,
                type: ComponentType.TextInput
            }],
            type: ComponentType.ActionRow
        }],
        custom_id: key
    });

    const response = await interaction.awaitModalSubmit(key);
    if (response === undefined) {
        return interaction.editParent(timeoutContent);
    }

    const code = response.values.code;
    const startedAt = Date.now();

    try {
        const result: unknown = await vm.runInNewContext(code);
        const timeTaken = Date.now() - startedAt;

        await response.editParent({
            components: [],
            content: "",
            embeds: [{
                color: 0x3ACD3A,
                description: `${config.emotes.check} Finished evaluating in ${timeTaken}ms.`,
                fields: [
                    {
                        name: "**Code**",
                        value: `\`\`\`\n${code}\n\`\`\``
                    },
                    {
                        name: "**Result**",
                        value: `\`\`\`\n${result}\n\`\`\``
                    }
                ],
                title: "Evaluation"
            }]
        });
    } catch (error: unknown) {
        const timeTaken = Date.now() - startedAt;
        const stack = error instanceof Error
            ? error.stack
            : error;

        await response.editParent({
            components: [],
            content: "",
            embeds: [{
                color: 0xED4245,
                description: `${config.emotes.error} Finished evaluating in ${timeTaken}ms.`,
                fields: [
                    {
                        name: "**Code**",
                        value: `\`\`\`\n${code}\n\`\`\``
                    },
                    {
                        name: "**Error**",
                        value: `\`\`\`\n${stack}\n\`\`\``
                    }
                ],
                title: "Evaluation"
            }]
        });
    }
}
