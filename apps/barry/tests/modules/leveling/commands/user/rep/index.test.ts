import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    createMockApplicationCommandInteraction,
    mockInteractionMember,
    mockUser
} from "@barry/testing";

import { ApplicationCommandInteraction } from "@barry/core";
import { MessageFlags } from "@discordjs/core";
import { createMockApplication } from "../../../../../mocks/application.js";
import { prisma } from "../../../../../mocks/index.js";

import LevelingModule from "../../../../../../src/modules/leveling/index.js";
import ReputationCommand from "../../../../../../src/modules/leveling/commands/user/rep/index.js";

describe("Add Reputation", () => {
    const guildID = "68239102456844360";
    const userID = "257522665437265920";

    let command: ReputationCommand;
    let interaction: ApplicationCommandInteraction;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new LevelingModule(client);
        command = new ReputationCommand(module);

        const data = createMockApplicationCommandInteraction();
        interaction = new ApplicationCommandInteraction(data, client, vi.fn());
        interaction.createMessage = vi.fn();

        vi.mocked(prisma.levelingSettings.findUnique).mockResolvedValue({
            guildID: guildID,
            enabled: true,
            ignoredChannels: [],
            ignoredRoles: []
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("execute", () => {
        it("should give reputation to the target user", async () => {
            const incrementSpy = vi.spyOn(command.module.memberActivity, "increment");

            await command.execute(interaction, {
                member: mockInteractionMember,
                user: { ...mockUser, id: userID }
            });

            expect(incrementSpy).toHaveBeenCalledOnce();
            expect(incrementSpy).toHaveBeenCalledWith(guildID, userID, {
                reputation: 1
            });
            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                content: expect.stringContaining(`Gave +1 rep to <@${userID}>.`)
            });
        });

        it("should not give reputation to bots", async () => {
            const incrementSpy = vi.spyOn(command.module.memberActivity, "increment");

            await command.execute(interaction, {
                member: mockInteractionMember,
                user: { ...mockUser, bot: true, id: userID }
            });

            expect(incrementSpy).not.toHaveBeenCalled();
            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                content: expect.stringContaining("You cannot give reputation to a bot."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should not give reputation to the initiator", async () => {
            const incrementSpy = vi.spyOn(command.module.memberActivity, "increment");

            await command.execute(interaction, {
                member: mockInteractionMember,
                user: mockUser
            });

            expect(incrementSpy).not.toHaveBeenCalled();
            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                content: expect.stringContaining("You cannot give yourself reputation."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should not give reputation to a user with a blacklisted role", async () => {
            const incrementSpy = vi.spyOn(command.module.memberActivity, "increment");
            vi.mocked(prisma.levelingSettings.findUnique).mockResolvedValue({
                guildID: guildID,
                enabled: true,
                ignoredChannels: [],
                ignoredRoles: ["68239102456844360"]
            });

            await command.execute(interaction, {
                member: { ...mockInteractionMember, roles: ["68239102456844360"] },
                user: { ...mockUser, id: userID }
            });

            expect(incrementSpy).not.toHaveBeenCalled();
            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                content: expect.stringContaining("This user cannot receive reputation."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should not give reputation if the initiator has a blacklisted role", async () => {
            const incrementSpy = vi.spyOn(command.module.memberActivity, "increment");
            vi.mocked(prisma.levelingSettings.findUnique).mockResolvedValue({
                guildID: guildID,
                enabled: true,
                ignoredChannels: [],
                ignoredRoles: ["68239102456844360"]
            });

            interaction.member = { ...mockInteractionMember, roles: ["68239102456844360"] };

            await command.execute(interaction, {
                member: mockInteractionMember,
                user: { ...mockUser, id: userID }
            });

            expect(incrementSpy).not.toHaveBeenCalled();
            expect(interaction.createMessage).toHaveBeenCalledOnce();
            expect(interaction.createMessage).toHaveBeenCalledWith({
                content: expect.stringContaining("You are not allowed to use this command."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should ignore if the command was invoked outside a guild", async () => {
            const incrementSpy = vi.spyOn(command.module.memberActivity, "increment");
            interaction.guildID = undefined;

            await command.execute(interaction, {
                member: mockInteractionMember,
                user: { ...mockUser, id: userID }
            });

            expect(incrementSpy).not.toHaveBeenCalled();
        });
    });
});
