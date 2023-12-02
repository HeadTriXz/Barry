import { type GuildInteraction, UpdatableInteraction } from "@barry-bot/core";
import { BooleanGuildSettingOption } from "../../../src/config/options/BooleanGuildSettingOption.js";
import { GuildSettingType } from "../../../src/config/option.js";
import { GuildSettingsStore } from "../../../src/config/store.js";
import { createMockApplication } from "../../mocks/index.js";
import { createMockMessageComponentInteraction } from "@barry-bot/testing";

describe("BooleanGuildSettingOption", () => {
    let interaction: GuildInteraction<UpdatableInteraction>;
    let option: BooleanGuildSettingOption<any, any>;

    beforeEach(() => {
        const client = createMockApplication();
        const data = createMockMessageComponentInteraction();
        interaction = new UpdatableInteraction(data, client) as GuildInteraction<UpdatableInteraction>;

        option = new BooleanGuildSettingOption({
            name: "Enabled",
            description: "Whether the module is enabled."
        });

        option.key = "enabled";
        option.store = new GuildSettingsStore();
    });

    describe("constructor", () => {
        it("should set the type to 'Boolean'", () => {
            expect(option.type).toBe(GuildSettingType.Boolean);
        });

        it("should set the 'onEdit' callback to 'handle' by default", async () => {
            const handleSpy = vi.spyOn(option, "handle").mockResolvedValue();

            await option.onEdit(option, interaction);

            expect(handleSpy).toHaveBeenCalledOnce();
            expect(handleSpy).toHaveBeenCalledWith(interaction);
        });

        it("should set the 'onView' callback to 'getValue' by default", async () => {
            const getValueSpy = vi.spyOn(option, "getValue").mockResolvedValue("`True`");

            await option.onView(option, interaction);

            expect(getValueSpy).toHaveBeenCalledOnce();
            expect(getValueSpy).toHaveBeenCalledWith(interaction);
        });
    });

    describe("getValue", () => {
        it("should return '`True`' if the value is true", async () => {
            await option.set(interaction.guildID, true);

            const value = await option.getValue(interaction);
            expect(value).toBe("`True`");
        });

        it("should return '`False`' if the value is false", async () => {
            await option.set(interaction.guildID, false);

            const value = await option.getValue(interaction);
            expect(value).toBe("`False`");
        });

        it("should return '`None`' if the value is null", async () => {
            await option.set(interaction.guildID, null);

            const value = await option.getValue(interaction);
            expect(value).toBe("`None`");
        });
    });

    describe("handle", () => {
        it("should set the value to true if it is false", async () => {
            await option.set(interaction.guildID, false);

            await option.handle(interaction);

            const value = await option.get(interaction.guildID);
            expect(value).toBe(true);
        });

        it("should set the value to false if it is true", async () => {
            await option.set(interaction.guildID, true);

            await option.handle(interaction);

            const value = await option.get(interaction.guildID);
            expect(value).toBe(false);
        });

        it("should set the value to true if it is null", async () => {
            option.nullable = true;
            await option.set(interaction.guildID, null);

            await option.handle(interaction);

            const value = await option.get(interaction.guildID);
            expect(value).toBe(true);
        });

        it("should throw an error if the value is not a boolean", async () => {
            await option.set(interaction.guildID, "test");

            await expect(() => option.handle(interaction)).rejects.toThrow("The setting 'enabled' is not of type 'boolean'.");
        });
    });
});
