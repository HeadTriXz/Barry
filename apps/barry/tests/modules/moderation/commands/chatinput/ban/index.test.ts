import type { BanOptions } from "../../../../../../src/types/moderation.js";

import { ApplicationCommandInteraction, AutocompleteInteraction } from "@barry-bot/core";
import { createMockApplicationCommandInteraction, createMockAutocompleteInteraction } from "@barry-bot/testing";

import { ApplicationCommandType } from "@discordjs/core";
import { COMMON_SEVERE_REASONS } from "../../../../../../src/modules/moderation/constants.js";
import { createMockApplication } from "../../../../../mocks/application.js";

import BanCommand from "../../../../../../src/modules/moderation/commands/chatinput/ban/index.js";
import ModerationModule from "../../../../../../src/modules/moderation/index.js";

describe("/ban", () => {
    let command: BanCommand;
    let interaction: ApplicationCommandInteraction;
    let options: BanOptions;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new ModerationModule(client);
        command = new BanCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client, vi.fn());

        options = {
            duration: undefined,
            member: undefined,
            reason: "Hello world!",
            user: interaction.user
        };
    });

    describe("execute", () => {
        it("should call the ban function correctly", async () => {
            const banSpy = vi.spyOn(command.module.actions, "ban").mockResolvedValue(undefined);

            await command.execute(interaction, options);

            expect(banSpy).toHaveBeenCalledOnce();
            expect(banSpy).toHaveBeenCalledWith(interaction, options);
        });
    });

    describe("Autocomplete 'reason'", () => {
        it("should show a predefined list of reasons if no value is provided", async () => {
            const data = createMockAutocompleteInteraction({
                id: "49072635294295155",
                name: "ban",
                options: [],
                type: ApplicationCommandType.ChatInput
            });
            const interaction = new AutocompleteInteraction(data, command.client, vi.fn());

            const result = await command.options[1].autocomplete?.("" as never, interaction);

            expect(result).toEqual(COMMON_SEVERE_REASONS.map((x) => ({ name: x, value: x })));
        });

        it("should show a matching predefined option if the option starts with the value", async () => {
            const data = createMockAutocompleteInteraction({
                id: "49072635294295155",
                name: "ban",
                options: [],
                type: ApplicationCommandType.ChatInput
            });
            const interaction = new AutocompleteInteraction(data, command.client, vi.fn());

            const result = await command.options[1].autocomplete?.(
                COMMON_SEVERE_REASONS[0].slice(0, 5) as never,
                interaction
            );

            expect(result).toEqual([{
                name: COMMON_SEVERE_REASONS[0],
                value: COMMON_SEVERE_REASONS[0]
            }]);
        });
    });
});
