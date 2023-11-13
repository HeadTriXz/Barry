import {
    type GuildInteraction,
    MessageComponentInteraction,
    UpdatableInteraction
} from "@barry/core";

import { ComponentType } from "@discordjs/core";
import { GuildSettingType } from "../../../src/config/option.js";
import { GuildSettingsStore } from "../../../src/config/store.js";
import { RoleGuildSettingOption } from "../../../src/config/options/RoleGuildSettingOption.js";
import { createMockApplication } from "../../mocks/index.js";
import { createMockMessageComponentInteraction } from "@barry/testing";
import { timeoutContent } from "../../../src/common.js";

describe("RoleGuildSettingOption", () => {
    let interaction: GuildInteraction<UpdatableInteraction>;
    let option: RoleGuildSettingOption<any, any>;

    beforeEach(() => {
        const client = createMockApplication();
        const data = createMockMessageComponentInteraction();
        interaction = new UpdatableInteraction(data, client, vi.fn()) as GuildInteraction<UpdatableInteraction>;
        interaction.editParent = vi.fn();

        option = new RoleGuildSettingOption({
            name: "Role",
            description: "The role that will be awarded."
        });

        option.key = "roleID";
        option.store = new GuildSettingsStore();
    });

    describe("constructor", () => {
        it("should set the type to 'Role'", () => {
            expect(option.type).toBe(GuildSettingType.Role);
        });

        it("should set the 'onEdit' callback to 'handle' by default", async () => {
            const handleSpy = vi.spyOn(option, "handle").mockResolvedValue();

            await option.onEdit(option, interaction);

            expect(handleSpy).toHaveBeenCalledOnce();
            expect(handleSpy).toHaveBeenCalledWith(interaction);
        });

        it("should set the 'onView' callback to 'getValue' by default", async () => {
            const getValueSpy = vi.spyOn(option, "getValue").mockResolvedValue("@everyone");

            await option.onView(option, interaction);

            expect(getValueSpy).toHaveBeenCalledOnce();
            expect(getValueSpy).toHaveBeenCalledWith(interaction);
        });
    });

    describe("getValue", () => {
        it("should return '<@&role_id>' if the value is 'role_id'", async () => {
            await option.set(interaction.guildID, "role_id");

            const value = await option.getValue(interaction);
            expect(value).toBe("<@&role_id>");
        });

        it("should return 'None' if the value is null", async () => {
            await option.set(interaction.guildID, null);

            const value = await option.getValue(interaction);
            expect(value).toBe("`None`");
        });
    });

    describe("handle", () => {
        beforeEach(async () => {
            await option.set(interaction.guildID, "other_role_id");
        });

        it("should set the value to 'role_id' if the user selected 'role_id'", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.RoleSelect,
                custom_id: "config-role",
                resolved: {
                    roles: {}
                },
                values: ["role_id"]
            });
            const response = new MessageComponentInteraction(data, interaction.client, vi.fn());
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);

            await option.handle(interaction);

            const value = await option.get(interaction.guildID);
            expect(value).toBe("role_id");
        });

        it("should set the value to null if the user selected nothing", async () => {
            option.nullable = true;
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.RoleSelect,
                custom_id: "config-role",
                resolved: {
                    roles: {}
                },
                values: []
            });
            const response = new MessageComponentInteraction(data, interaction.client, vi.fn());
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);

            await option.handle(interaction);

            const value = await option.get(interaction.guildID);
            expect(value).toBeNull();
        });

        it("should send a timeout message if the user does not respond", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

            await option.handle(interaction);

            expect(interaction.editParent).toHaveBeenCalledTimes(2);
            expect(interaction.editParent).toHaveBeenCalledWith(timeoutContent);
        });

        it("should throw an error if the value is not a string", async () => {
            await option.set(interaction.guildID, 1234);

            await expect(() => option.handle(interaction)).rejects.toThrowError(
                "The setting 'roleID' is not of type 'string'."
            );
        });

        it("should not throw an error if the value is null and the setting is nullable", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);
            option.nullable = true;

            await option.set(interaction.guildID, null);

            await expect(option.handle(interaction)).resolves.not.toThrowError();
        });
    });
});
