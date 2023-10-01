import type { MuteOptions } from "../../../../../../src/types/moderation.js";

import { ApplicationCommandInteraction, AutocompleteInteraction } from "@barry/core";
import { ApplicationCommandType } from "@discordjs/core";
import {
    createMockApplicationCommandInteraction,
    createMockAutocompleteInteraction,
    mockMember,
    mockUser
} from "@barry/testing";

import { COMMON_MINOR_REASONS } from "../../../../../../src/modules/moderation/constants.js";
import { createMockApplication } from "../../../../../mocks/application.js";

import MuteCommand from "../../../../../../src/modules/moderation/commands/chatinput/mute/index.js";
import ModerationModule from "../../../../../../src/modules/moderation/index.js";

describe("/mute", () => {
    let command: MuteCommand;
    let interaction: ApplicationCommandInteraction;
    let options: MuteOptions;

    beforeEach(() => {
        vi.useFakeTimers().setSystemTime("1-1-2023");

        const client = createMockApplication();
        const module = new ModerationModule(client);
        command = new MuteCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client, vi.fn());

        options = {
            duration: "5m",
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
        it("should call the mute function correctly", async () => {
            const muteSpy = vi.spyOn(command.module.actions, "mute").mockResolvedValue(undefined);

            await command.execute(interaction, options);

            expect(muteSpy).toHaveBeenCalledOnce();
            expect(muteSpy).toHaveBeenCalledWith(interaction, options);
        });
    });

    describe("Autocomplete 'reason'", () => {
        it("should show a predefined list of reasons if no value is provided", async () => {
            const data = createMockAutocompleteInteraction({
                id: "49072635294295155",
                name: "mute",
                options: [],
                type: ApplicationCommandType.ChatInput
            });
            const interaction = new AutocompleteInteraction(data, command.client, vi.fn());

            const result = await command.options[2].autocomplete?.("" as never, interaction);

            expect(result).toEqual(COMMON_MINOR_REASONS.map((x) => ({ name: x, value: x })));
        });

        it("should show a matching predefined option if the option starts with the value", async () => {
            const data = createMockAutocompleteInteraction({
                id: "49072635294295155",
                name: "mute",
                options: [],
                type: ApplicationCommandType.ChatInput
            });
            const interaction = new AutocompleteInteraction(data, command.client, vi.fn());

            const result = await command.options[2].autocomplete?.(
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
