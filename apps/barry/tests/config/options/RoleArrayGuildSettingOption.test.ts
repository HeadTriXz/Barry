import {
    type GuildInteraction,
    MessageComponentInteraction,
    UpdatableInteraction
} from "@barry-bot/core";

import { ComponentType } from "@discordjs/core";
import { GuildSettingType } from "../../../src/config/option.js";
import { GuildSettingsStore } from "../../../src/config/store.js";
import { RoleArrayGuildSettingOption } from "../../../src/config/options/RoleArrayGuildSettingOption.js";
import { createMockApplication } from "../../mocks/index.js";
import { createMockMessageComponentInteraction } from "@barry-bot/testing";
import { timeoutContent } from "../../../src/common.js";

describe("RoleArrayGuildSettingOption", () => {
    let interaction: GuildInteraction<UpdatableInteraction>;
    let option: RoleArrayGuildSettingOption<any, any>;

    beforeEach(() => {
        const client = createMockApplication();
        const data = createMockMessageComponentInteraction();
        interaction = new UpdatableInteraction(data, client, vi.fn()) as GuildInteraction<UpdatableInteraction>;
        interaction.editParent = vi.fn();

        option = new RoleArrayGuildSettingOption({
            name: "Roles",
            description: "The roles that will be banned."
        });

        option.key = "roles";
        option.store = new GuildSettingsStore();
    });

    describe("constructor", () => {
        it("should set the type to 'RoleArray'", () => {
            expect(option.type).toBe(GuildSettingType.RoleArray);
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
            await option.set(interaction.guildID, ["role_id"]);

            const value = await option.getValue(interaction);
            expect(value).toBe("<@&role_id>");
        });

        it("should return '<@&role_id>, <@&other_role_id>' if the value is 'role_id', 'other_role_id'", async () => {
            await option.set(interaction.guildID, ["role_id", "other_role_id"]);

            const value = await option.getValue(interaction);
            expect(value).toBe("<@&role_id>, <@&other_role_id>");
        });

        it("should return 'None' if the value is null", async () => {
            await option.set(interaction.guildID, null);

            const value = await option.getValue(interaction);
            expect(value).toBe("`None`");
        });

        it("should return 'None' if the value is an empty array", async () => {
            await option.set(interaction.guildID, []);

            const value = await option.getValue(interaction);
            expect(value).toBe("`None`");
        });
    });

    describe("handle", () => {
        beforeEach(async () => {
            await option.set(interaction.guildID, ["role_id"]);
        });

        it("should set the value to 'other_role_id' if the user selects 'other_role_id'", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.RoleSelect,
                custom_id: "config-roles",
                resolved: {
                    roles: {}
                },
                values: ["other_role_id"]
            });
            const response = new MessageComponentInteraction(data, interaction.client, vi.fn());
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);

            await option.handle(interaction);

            const value = await option.get(interaction.guildID);
            expect(value).toEqual(["other_role_id"]);
        });

        it("should set the value to 'role_id', 'other_role_id' if the user selects 'role_id', 'other_role_id'", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.RoleSelect,
                custom_id: "config-roles",
                resolved: {
                    roles: {}
                },
                values: ["role_id", "other_role_id"]
            });
            const response = new MessageComponentInteraction(data, interaction.client, vi.fn());
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);

            await option.handle(interaction);

            const value = await option.get(interaction.guildID);
            expect(value).toEqual(["role_id", "other_role_id"]);
        });

        it("should send a timeout message if the user does not respond", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

            await option.handle(interaction);

            expect(interaction.editParent).toHaveBeenCalledTimes(2);
            expect(interaction.editParent).toHaveBeenCalledWith(timeoutContent);
        });

        it("should throw an error if the value is not an array", async () => {
            await option.set(interaction.guildID, "role_id");

            await expect(() => option.handle(interaction)).rejects.toThrowError(
                "The setting 'roles' is not of type 'string[]'."
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
