import { createMockApplicationCommandInteraction, mockUser } from "@barry-bot/testing";

import { ApplicationCommandInteraction } from "@barry-bot/core";
import { createMockApplication } from "../../../../../mocks/application.js";

import LevelingModule from "../../../../../../src/modules/leveling/index.js";
import RankCommand from "../../../../../../src/modules/leveling/commands/chatinput/rank/index.js";
import * as viewRank from "../../../../../../src/modules/leveling/functions/viewRank.js";

describe("/rank", () => {
    let command: RankCommand;
    let interaction: ApplicationCommandInteraction;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new LevelingModule(client);
        command = new RankCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client);

        vi.spyOn(viewRank, "viewRank").mockResolvedValue();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe("execute", () => {
        it("should send the user's rank card", async () => {
            await command.execute(interaction, { user: mockUser });

            expect(viewRank.viewRank).toHaveBeenCalledOnce();
        });

        it("should send the author's rank card if no user is provided", async () => {
            await command.execute(interaction, {});

            expect(viewRank.viewRank).toHaveBeenCalledOnce();
        });
    });
});
