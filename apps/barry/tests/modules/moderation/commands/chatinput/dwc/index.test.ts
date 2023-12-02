import type { DWCOptions } from "../../../../../../src/types/moderation.js";

import { ApplicationCommandInteraction, AutocompleteInteraction } from "@barry-bot/core";
import {
    createMockApplicationCommandInteraction,
    createMockAutocompleteInteraction,
    mockUser
} from "@barry-bot/testing";

import { ApplicationCommandType } from "@discordjs/core";
import { COMMON_DWC_REASONS } from "../../../../../../src/modules/moderation/constants.js";
import { createMockApplication } from "../../../../../mocks/application.js";

import DWCCommand from "../../../../../../src/modules/moderation/commands/chatinput/dwc/index.js";
import ModerationModule from "../../../../../../src/modules/moderation/index.js";

describe("/dwc", () => {
    let command: DWCCommand;
    let interaction: ApplicationCommandInteraction;
    let options: DWCOptions;

    beforeEach(() => {
        const client = createMockApplication();
        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client, vi.fn());

        const module = new ModerationModule(client);
        command = new DWCCommand(module);

        options = {
            reason: "Hello World!",
            user: { ...mockUser, id: "257522665437265920" }
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("execute", () => {
        it("should call the dwc function correctly", async () => {
            const dwcSpy = vi.spyOn(command.module.actions, "dwc").mockResolvedValue(undefined);

            await command.execute(interaction, options);

            expect(dwcSpy).toHaveBeenCalledOnce();
            expect(dwcSpy).toHaveBeenCalledWith(interaction, options);
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

            expect(result).toEqual(COMMON_DWC_REASONS.map((x) => ({ name: x, value: x })));
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
                COMMON_DWC_REASONS[0].slice(0, 5) as never,
                interaction
            );

            expect(result).toEqual([{
                name: COMMON_DWC_REASONS[0],
                value: COMMON_DWC_REASONS[0]
            }]);
        });
    });
});
