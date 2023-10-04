import {
    ApplicationCommandInteraction,
    MessageComponentInteraction
} from "@barry/core";
import {
    createMockApplicationCommandInteraction,
    createMockMessageComponentInteraction,
    mockMessage
} from "@barry/testing";
import { ComponentType } from "@discordjs/core";
import { createMockApplication } from "../../../../../mocks/application.js";
import { timeoutContent } from "../../../../../../src/modules/marketplace/constants.js";

import DevToolsCommand, { DevTool } from "../../../../../../src/modules/developers/commands/chatinput/devtools/index.js";
import DevelopersModule from "../../../../../../src/modules/developers/index.js";
import * as tools from "../../../../../../src/modules/developers/commands/chatinput/devtools/tools/index.js";

describe("/devtools", () => {
    let command: DevToolsCommand;
    let interaction: ApplicationCommandInteraction;
    let response: MessageComponentInteraction;
    let values: string[];

    beforeEach(() => {
        const client = createMockApplication();
        const module = new DevelopersModule(client);
        command = new DevToolsCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client, vi.fn());
        values = [];

        const responseData = createMockMessageComponentInteraction({
            component_type: ComponentType.StringSelect,
            custom_id: "devtools-select-tool",
            values: values
        });

        response = new MessageComponentInteraction(responseData, client, vi.fn());

        vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
    });

    describe("execute", () => {
        it("should send the eval tool if selected", async () => {
            const evalSpy = vi.spyOn(tools, "evaluate").mockResolvedValue();
            values.push(DevTool.Eval);

            await command.execute(interaction);

            expect(evalSpy).toHaveBeenCalledOnce();
            expect(evalSpy).toHaveBeenCalledWith(response);
        });

        it("should send the blacklist user tool if selected", async () => {
            const blacklistSpy = vi.spyOn(tools, "blacklistUser").mockResolvedValue();
            values.push(DevTool.BlacklistUser);

            await command.execute(interaction);

            expect(blacklistSpy).toHaveBeenCalledOnce();
            expect(blacklistSpy).toHaveBeenCalledWith(command.module, response);
        });

        it("should send the unblacklist user tool if selected", async () => {
            const unblacklistSpy = vi.spyOn(tools, "unblacklistUser").mockResolvedValue();
            values.push(DevTool.UnblacklistUser);

            await command.execute(interaction);

            expect(unblacklistSpy).toHaveBeenCalledOnce();
            expect(unblacklistSpy).toHaveBeenCalledWith(command.module, response);
        });

        it("should send the blacklist guild tool if selected", async () => {
            const blacklistSpy = vi.spyOn(tools, "blacklistGuild").mockResolvedValue();
            values.push(DevTool.BlacklistGuild);

            await command.execute(interaction);

            expect(blacklistSpy).toHaveBeenCalledOnce();
            expect(blacklistSpy).toHaveBeenCalledWith(command.module, response);
        });

        it("should send the unblacklist guild tool if selected", async () => {
            const unblacklistSpy = vi.spyOn(tools, "unblacklistGuild").mockResolvedValue();
            values.push(DevTool.UnblacklistGuild);

            await command.execute(interaction);

            expect(unblacklistSpy).toHaveBeenCalledOnce();
            expect(unblacklistSpy).toHaveBeenCalledWith(command.module, response);
        });

        it("should show a timeout message if the user doesn't select a tool in time", async () => {
            const editSpy = vi.spyOn(interaction, "editOriginalMessage").mockResolvedValue(mockMessage);
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

            await command.execute(interaction);

            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith(timeoutContent);
        });
    });
});
