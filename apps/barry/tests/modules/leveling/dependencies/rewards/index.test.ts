import type { Reward, RewardsSettings } from "@prisma/client";

import { MessageComponentInteraction, ModalSubmitInteraction } from "@barry/core";
import { RewardRepository, RewardsSettingsRepository } from "../../../../../src/modules/leveling/dependencies/rewards/database/index.js";
import {
    createMockMessageComponentInteraction,
    createMockModalSubmitInteraction,
    mockMember
} from "@barry/testing";

import { ComponentType } from "@discordjs/core";
import { DiscordAPIError } from "@discordjs/rest";
import { createMockApplication } from "../../../../mocks/application.js";
import { timeoutContent } from "../../../../../src/common.js";

import RewardsModule from "../../../../../src/modules/leveling/dependencies/rewards/index.js";

describe("RewardsModule", () => {
    const guildID = "68239102456844360";
    const userID = "257522665441460225";

    let module: RewardsModule;
    let rewards: Reward[];
    let settings: RewardsSettings;

    beforeEach(() => {
        const client = createMockApplication();
        module = new RewardsModule(client);

        rewards = [
            {
                guildID: guildID,
                id: 1,
                level: 5,
                roleID: "732391024568445620"
            },
            {
                guildID: guildID,
                id: 2,
                level: 10,
                roleID: "732391024568445685"
            }
        ];

        settings = {
            guildID: guildID,
            enabled: true,
            keepRewards: true
        };

        vi.spyOn(client.api.guilds, "getMember").mockResolvedValue(mockMember);
        vi.spyOn(module.rewards, "delete").mockResolvedValue();
        vi.spyOn(module.rewards, "getAll").mockResolvedValue(rewards);
        vi.spyOn(module.rewards, "getBelow").mockResolvedValue(rewards);
        vi.spyOn(module.settings, "getOrCreate").mockResolvedValue(settings);
    });

    describe("constructor", () => {
        it("should set up the repositories correctly", () => {
            expect(module.rewards).toBeInstanceOf(RewardRepository);
            expect(module.settings).toBeInstanceOf(RewardsSettingsRepository);
        });
    });

    describe("claimRewards", () => {
        it("should claim all rewards for the specified member", async () => {
            const addRoleSpy = vi.spyOn(module.client.api.guilds, "addRoleToMember").mockResolvedValue();

            await module.claimRewards(guildID, userID, 10);

            expect(addRoleSpy).toHaveBeenCalledTimes(2);
            expect(addRoleSpy).toHaveBeenCalledWith(guildID, userID, rewards[0].roleID);
            expect(addRoleSpy).toHaveBeenCalledWith(guildID, userID, rewards[1].roleID);
        });

        it("should only add the highest reward if the member if keepRewards is 'false'", async () => {
            const addRoleSpy = vi.spyOn(module.client.api.guilds, "addRoleToMember").mockResolvedValue();
            settings.keepRewards = false;

            await module.claimRewards(guildID, userID, 10);

            expect(addRoleSpy).toHaveBeenCalledOnce();
            expect(addRoleSpy).toHaveBeenCalledWith(guildID, userID, rewards[1].roleID);
        });

        it("should remove all previous rewards from the member if keepRewards is 'false'", async () => {
            vi.spyOn(module.client.api.guilds, "getMember").mockResolvedValue({ ...mockMember, roles: [rewards[0].roleID] });

            const removeRoleSpy = vi.spyOn(module.client.api.guilds, "removeRoleFromMember").mockResolvedValue();
            settings.keepRewards = false;

            await module.claimRewards(guildID, userID, 10);

            expect(removeRoleSpy).toHaveBeenCalledTimes(1);
            expect(removeRoleSpy).toHaveBeenCalledWith(guildID, userID, rewards[0].roleID);
        });

        it("should not remove previous rewards from the member if keepRewards is 'true'", async () => {
            vi.spyOn(module.client.api.guilds, "getMember").mockResolvedValue({ ...mockMember, roles: [rewards[0].roleID] });

            const removeRoleSpy = vi.spyOn(module.client.api.guilds, "removeRoleFromMember").mockResolvedValue();
            settings.keepRewards = true;

            await module.claimRewards(guildID, userID, 10);

            expect(removeRoleSpy).not.toHaveBeenCalled();
        });

        it("should ignore if there are no rewards for the specified member", async () => {
            vi.spyOn(module.rewards, "getBelow").mockResolvedValue([]);

            const addRoleSpy = vi.spyOn(module.client.api.guilds, "addRoleToMember").mockResolvedValue();

            await module.claimRewards(guildID, userID, 10);

            expect(addRoleSpy).not.toHaveBeenCalled();
        });

        it("should delete the reward if the role is not found", async () => {
            const rawError = {
                code: 10011,
                message: "Unknown Role"
            };
            const error = new DiscordAPIError(rawError, 10011, 404, "PUT", "", {});
            vi.spyOn(module.client.api.guilds, "addRoleToMember").mockRejectedValueOnce(error);

            await module.claimRewards(guildID, userID, 10);

            expect(module.rewards.delete).toHaveBeenCalledOnce();
            expect(module.rewards.delete).toHaveBeenCalledWith(rewards[0].id);
        });

        it("should log an error if the role is not found", async () => {
            const rawError = {
                code: 10011,
                message: "Unknown Role"
            };
            const error = new DiscordAPIError(rawError, 10011, 404, "PUT", "", {});

            vi.spyOn(module.client.api.guilds, "removeRoleFromMember").mockRejectedValueOnce(error);
            vi.spyOn(module.client.api.guilds, "getMember").mockResolvedValue({ ...mockMember, roles: [rewards[0].roleID] });
            settings.keepRewards = false;

            await module.claimRewards(guildID, userID, 10);

            expect(module.client.logger.error).toHaveBeenCalledOnce();
            expect(module.client.logger.error).toHaveBeenCalledWith(error);
        });

        it("should log an error if there was an unexpected error", async () => {
            const error = new Error("Oh no!");
            vi.spyOn(module.client.api.guilds, "getMember").mockRejectedValueOnce(error);

            await module.claimRewards(guildID, userID, 10);

            expect(module.client.logger.error).toHaveBeenCalledOnce();
            expect(module.client.logger.error).toHaveBeenCalledWith(error);
        });
    });

    describe("deleteReward", () => {
        let interaction: MessageComponentInteraction;
        let response: MessageComponentInteraction;

        beforeEach(() => {
            const data = createMockMessageComponentInteraction();
            interaction = new MessageComponentInteraction(data, module.client, vi.fn());
            interaction.editParent = vi.fn();

            const responseData = createMockMessageComponentInteraction({
                component_type: ComponentType.RoleSelect,
                custom_id: "role",
                resolved: {
                    roles: {}
                },
                values: [rewards[0].roleID]
            });
            response = new MessageComponentInteraction(responseData, module.client, vi.fn());
            response.editParent = vi.fn();

            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
        });

        it("should delete the reward which the user selects", async () => {
            await module.deleteReward(interaction, rewards);

            expect(module.rewards.delete).toHaveBeenCalledOnce();
            expect(module.rewards.delete).toHaveBeenCalledWith(1);
        });

        it("should send a timeout message if the user does not respond", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

            await module.deleteReward(interaction, rewards);

            expect(interaction.editParent).toHaveBeenCalledTimes(2);
            expect(interaction.editParent).toHaveBeenCalledWith(timeoutContent);
        });

        it("should send an error message if the selected role is not a reward", async () => {
            const responseData = createMockMessageComponentInteraction({
                component_type: ComponentType.RoleSelect,
                custom_id: "role",
                resolved: {
                    roles: {}
                },
                values: ["732391024568445699"]
            });
            response = new MessageComponentInteraction(responseData, module.client, vi.fn());
            response.editParent = vi.fn();

            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);

            await module.deleteReward(interaction, rewards);

            expect(response.editParent).toHaveBeenCalledOnce();
            expect(response.editParent).toHaveBeenCalledWith({
                content: expect.stringContaining("That role is not a reward.")
            });
        });

        it("should ignore if the interaction was invoked outside a guild", async () => {
            delete interaction.guildID;

            await module.deleteReward(interaction, rewards);

            expect(module.rewards.delete).not.toHaveBeenCalled();
        });
    });

    describe("handleRewards", () => {
        let interaction: MessageComponentInteraction;

        beforeEach(() => {
            const data = createMockMessageComponentInteraction();
            interaction = new MessageComponentInteraction(data, module.client, vi.fn());
            interaction.editParent = vi.fn();

            module.deleteReward = vi.fn();
            module.manageReward = vi.fn();
        });

        it("should manage rewards if the user clicks the manage button", async () => {
            const responseData = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "manage"
            });
            const response = new MessageComponentInteraction(responseData, module.client, vi.fn());

            vi.spyOn(module.rewards, "getAll").mockResolvedValue([]);
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);

            await module.handleRewards(interaction);

            expect(module.manageReward).toHaveBeenCalledOnce();
            expect(module.manageReward).toHaveBeenCalledWith(response, []);
        });

        it("should delete a reward if the user clicks the delete button", async () => {
            const responseData = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "delete"
            });
            const response = new MessageComponentInteraction(responseData, module.client, vi.fn());

            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);

            await module.handleRewards(interaction);

            expect(module.deleteReward).toHaveBeenCalledOnce();
            expect(module.deleteReward).toHaveBeenCalledWith(response, rewards);
        });

        it("should ignore if the interaction was invoked outside a guild", async () => {
            delete interaction.guildID;

            await module.handleRewards(interaction);

            expect(module.manageReward).not.toHaveBeenCalled();
            expect(module.deleteReward).not.toHaveBeenCalled();
        });

        it("should send a timeout message if the user does not respond", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

            await module.handleRewards(interaction);

            expect(interaction.editParent).toHaveBeenCalledTimes(2);
            expect(interaction.editParent).toHaveBeenCalledWith(timeoutContent);
        });
    });

    describe("isEnabled", () => {
        it("should return 'true' if the rewards module is enabled", async () => {
            settings.enabled = true;

            const result = await module.isEnabled(guildID);
            expect(result).toBe(true);
        });

        it("should return 'false' if the rewards module is disabled", async () => {
            settings.enabled = false;

            const result = await module.isEnabled(guildID);
            expect(result).toBe(false);
        });
    });

    describe("manageReward", () => {
        const roleID = "732391024568445699";

        let interaction: MessageComponentInteraction;
        let levelResponse: ModalSubmitInteraction;
        let roleResponse: MessageComponentInteraction;

        beforeEach(() => {
            vi.useFakeTimers().setSystemTime("01-01-2023");
            const data = createMockMessageComponentInteraction();
            interaction = new MessageComponentInteraction(data, module.client, vi.fn());
            interaction.editParent = vi.fn();

            const roleData = createMockMessageComponentInteraction({
                component_type: ComponentType.RoleSelect,
                custom_id: "role",
                resolved: {
                    roles: {}
                },
                values: [roleID]
            });
            roleResponse = new MessageComponentInteraction(roleData, module.client, vi.fn());
            roleResponse.editParent = vi.fn();

            const levelData = createMockModalSubmitInteraction({
                components: [{
                    components: [{
                        custom_id: "level",
                        type: ComponentType.TextInput,
                        value: "5"
                    }],
                    type: ComponentType.ActionRow
                }],
                custom_id: `${Date.now()}-reward-manage`
            });
            levelResponse = new ModalSubmitInteraction(levelData, module.client, vi.fn());
            levelResponse.editParent = vi.fn();

            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(roleResponse);
            vi.spyOn(roleResponse, "awaitModalSubmit").mockResolvedValue(levelResponse);
            vi.spyOn(module.rewards, "create").mockResolvedValue(rewards[0]);
            vi.spyOn(module.rewards, "update").mockResolvedValue(rewards[0]);
        });

        it("should create a new reward if the user selects a new role", async () => {
            await module.manageReward(interaction, rewards);

            expect(module.rewards.create).toHaveBeenCalledOnce();
            expect(module.rewards.create).toHaveBeenCalledWith(guildID, roleID, 5);
        });

        it("should update the reward if the user selects an existing role", async () => {
            rewards[0].roleID = roleID;

            await module.manageReward(interaction, rewards);

            expect(module.rewards.update).toHaveBeenCalledOnce();
            expect(module.rewards.update).toHaveBeenCalledWith(1, 5);
        });

        it("should send an error message if the provided level is not a number", async () => {
            levelResponse.values.level = "abc";

            await module.manageReward(interaction, rewards);

            expect(levelResponse.editParent).toHaveBeenCalledOnce();
            expect(levelResponse.editParent).toHaveBeenCalledWith({
                content: expect.stringContaining("That is not a valid level.")
            });
        });

        it("should send an error message if the provided level is less than 1", async () => {
            levelResponse.values.level = "0";

            await module.manageReward(interaction, rewards);

            expect(levelResponse.editParent).toHaveBeenCalledOnce();
            expect(levelResponse.editParent).toHaveBeenCalledWith({
                content: expect.stringContaining("That is not a valid level.")
            });
        });

        it("should send a timeout message if the user does not select a role", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

            await module.manageReward(interaction, rewards);

            expect(interaction.editParent).toHaveBeenCalledTimes(2);
            expect(interaction.editParent).toHaveBeenCalledWith(timeoutContent);
        });

        it("should send a timeout message if the user does not select a level", async () => {
            vi.spyOn(roleResponse, "awaitModalSubmit").mockResolvedValue(undefined);

            await module.manageReward(interaction, rewards);

            expect(roleResponse.editParent).toHaveBeenCalledOnce();
            expect(roleResponse.editParent).toHaveBeenCalledWith(timeoutContent);
        });

        it("should ignore if the interaction was invoked outside a guild", async () => {
            delete interaction.guildID;

            await module.manageReward(interaction, rewards);

            expect(module.rewards.create).not.toHaveBeenCalled();
        });
    });
});
