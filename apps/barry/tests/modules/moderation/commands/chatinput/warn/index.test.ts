import type { WarnOptions } from "../../../../../../src/types/moderation.js";

import { ApplicationCommandInteraction, AutocompleteInteraction } from "@barry/core";
import {
    createMockApplicationCommandInteraction,
    createMockAutocompleteInteraction,
    mockMember,
    mockUser
} from "@barry/testing";

import { ApplicationCommandType } from "@discordjs/core";
import { COMMON_MINOR_REASONS } from "../../../../../../src/modules/moderation/constants.js";
import { createMockApplication } from "../../../../../mocks/application.js";

import WarnCommand from "../../../../../../src/modules/moderation/commands/chatinput/warn/index.js";
import ModerationModule from "../../../../../../src/modules/moderation/index.js";

describe("/warn", () => {
    let command: WarnCommand;
    let interaction: ApplicationCommandInteraction;
    let options: WarnOptions;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new ModerationModule(client);
        command = new WarnCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client, vi.fn());

        options = {
            member: {
                ...mockMember,
                user: {
                    ...mockUser,
                    id: "257522665437265920"
                }
            },
            reason: "Rude!"
        };
    });

    describe("execute", () => {
        it("should call the warn function correctly", async () => {
            const warnSpy = vi.spyOn(command.module.actions, "warn").mockResolvedValue(undefined);

            await command.execute(interaction, options);

            expect(warnSpy).toHaveBeenCalledOnce();
            expect(warnSpy).toHaveBeenCalledWith(interaction, options);
        });
    });

    describe("Autocomplete 'reason'", () => {
        it("should show a predefined list of reasons if no value is provided", async () => {
            const data = createMockAutocompleteInteraction({
                id: "49072635294295155",
                name: "warn",
                options: [],
                type: ApplicationCommandType.ChatInput
            });
            const interaction = new AutocompleteInteraction(data, command.client, vi.fn());

            const result = await command.options[1].autocomplete?.("" as never, interaction);

            expect(result).toEqual(COMMON_MINOR_REASONS.map((x) => ({ name: x, value: x })));
        });

        it("should show a matching predefined option if the option starts with the value", async () => {
            const data = createMockAutocompleteInteraction({
                id: "49072635294295155",
                name: "warn",
                options: [],
                type: ApplicationCommandType.ChatInput
            });
            const interaction = new AutocompleteInteraction(data, command.client, vi.fn());

            const result = await command.options[1].autocomplete?.(
                COMMON_MINOR_REASONS[0].slice(0, 5) as never,
                interaction
            );

            expect(result).toEqual([{
                name: COMMON_MINOR_REASONS[0],
                value: COMMON_MINOR_REASONS[0]
            }]);
        });
    });
});
