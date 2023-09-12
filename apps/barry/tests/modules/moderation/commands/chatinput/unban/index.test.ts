import {
    type Case,
    type ModerationSettings,
    CaseType
} from "@prisma/client";
import {
    createMockApplicationCommandInteraction,
    mockGuild,
    mockUser
} from "@barry/testing";

import { ApplicationCommandInteraction } from "@barry/core";
import { DiscordAPIError } from "@discordjs/rest";
import { MessageFlags } from "@discordjs/core";
import { createMockApplication } from "../../../../../mocks/index.js";
import { mockCase } from "../../../mocks/case.js";

import UnbanCommand, { type UnbanOptions } from "../../../../../../src/modules/moderation/commands/chatinput/unban/index.js";
import ModerationModule from "../../../../../../src/modules/moderation/index.js";

describe("/unban", () => {
    let command: UnbanCommand;
    let interaction: ApplicationCommandInteraction;
    let entity: Case;
    let options: UnbanOptions;
    let settings: ModerationSettings;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new ModerationModule(client);
        command = new UnbanCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client, vi.fn());

        entity = { ...mockCase, type: CaseType.Unban };
        options = {
            reason: "Oops",
            user: {
                ...mockUser,
                id: "257522665437265920"
            }
        };
        settings = {
            channelID: "30527482987641765",
            dwcDays: 7,
            dwcRoleID: null,
            enabled: true,
            guildID: "68239102456844360"
        };

        module.createLogMessage = vi.fn();
        module.notifyUser = vi.fn();
        vi.spyOn(client.api.guilds, "unbanUser").mockResolvedValue();
        vi.spyOn(client.api.guilds, "get").mockResolvedValue(mockGuild);
        vi.spyOn(module.cases, "create").mockResolvedValue(entity);
        vi.spyOn(module.moderationSettings, "getOrCreate").mockResolvedValue(settings);
    });

    describe("execute", () => {
        it("should unban the user", async () => {
            const unbanSpy = vi.spyOn(command.client.api.guilds, "unbanUser");

            await command.execute(interaction, options);

            expect(unbanSpy).toHaveBeenCalledOnce();
            expect(unbanSpy).toHaveBeenCalledWith(mockGuild.id, options.user.id, {
                reason: options.reason
            });
        });

        it("should send a success message", async () => {
            const createSpy = vi.spyOn(interaction, "createMessage");

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining(`Case \`34\` | Successfully unbanned \`${options.user.username}\`.`),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should create a log message", async () => {
            await command.execute(interaction, options);

            expect(command.module.createLogMessage).toHaveBeenCalledOnce();
            expect(command.module.createLogMessage).toHaveBeenCalledWith({
                case: entity,
                creator: interaction.user,
                reason: options.reason,
                user: options.user
            }, settings);
        });

        it("should ignore if the interaction was sent outside a guild", async () => {
            delete interaction.guildID;

            await command.execute(interaction, options);

            expect(interaction.acknowledged).toBe(false);
        });

        it("should show an error message if the user is not banned", async () => {
            const response = {
                code: 10026,
                message: "Unknown Ban"
            };

            const error = new DiscordAPIError(response, 10026, 404, "DELETE", "", {});
            const createSpy = vi.spyOn(interaction, "createMessage");
            vi.spyOn(command.client.api.guilds, "unbanUser").mockRejectedValue(error);

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("That user is not banned"),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should show an error message if the unban failed", async () => {
            const error = new Error("Oh no!");
            const createSpy = vi.spyOn(interaction, "createMessage");
            vi.spyOn(command.client.api.guilds, "unbanUser").mockRejectedValue(error);

            await command.execute(interaction, options);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("Failed to unban that user"),
                flags: MessageFlags.Ephemeral
            });
            expect(command.client.logger.error).toHaveBeenCalledOnce();
            expect(command.client.logger.error).toHaveBeenCalledWith(error);
        });
    });
});
