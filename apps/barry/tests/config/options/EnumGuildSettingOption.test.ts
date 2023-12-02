import {
    type GuildInteraction,
    MessageComponentInteraction,
    UpdatableInteraction
} from "@barry-bot/core";

import { ComponentType } from "@discordjs/core";
import { EnumGuildSettingOption } from "../../../src/config/options/EnumGuildSettingOption.js";
import { GuildSettingType } from "../../../src/config/option.js";
import { GuildSettingsStore } from "../../../src/config/store.js";
import { createMockApplication } from "../../mocks/index.js";
import { createMockMessageComponentInteraction } from "@barry-bot/testing";
import { timeoutContent } from "../../../src/common.js";

describe("EnumGuildSettingOption", () => {
    let interaction: GuildInteraction<UpdatableInteraction>;
    let option: EnumGuildSettingOption<any, any>;

    beforeEach(() => {
        const client = createMockApplication();
        const data = createMockMessageComponentInteraction();
        interaction = new UpdatableInteraction(data, client, vi.fn()) as GuildInteraction<UpdatableInteraction>;
        interaction.editParent = vi.fn();

        option = new EnumGuildSettingOption({
            name: "Prefix",
            description: "The prefix to use for commands.",
            values: ["!", "?", "/"]
        });

        option.key = "prefix";
        option.store = new GuildSettingsStore();
    });

    describe("constructor", () => {
        it("should set the type to 'Enum'", () => {
            expect(option.type).toBe(GuildSettingType.Enum);
        });

        it("should set the 'onEdit' callback to 'handle' by default", async () => {
            const handleSpy = vi.spyOn(option, "handle").mockResolvedValue();

            await option.onEdit(option, interaction);

            expect(handleSpy).toHaveBeenCalledOnce();
            expect(handleSpy).toHaveBeenCalledWith(interaction);
        });

        it("should set the 'onView' callback to 'getValue' by default", async () => {
            const getValueSpy = vi.spyOn(option, "getValue").mockResolvedValue("`!`");

            await option.onView(option, interaction);

            expect(getValueSpy).toHaveBeenCalledOnce();
            expect(getValueSpy).toHaveBeenCalledWith(interaction);
        });
    });

    describe("getValue", () => {
        it("should return the value if it exists", async () => {
            await option.set(interaction.guildID, "?");

            const value = await option.getValue(interaction);

            expect(value).toBe("``?``");
        });

        it("should return 'None' if the value does not exist", async () => {
            const value = await option.getValue(interaction);

            expect(value).toBe("`None`");
        });
    });

    describe("handle", () => {
        beforeEach(async () => {
            await option.set(interaction.guildID, "?");
        });

        it("should set the value to '!' if the user selects '!'", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "config-enum",
                values: ["!"]
            });
            const response = new MessageComponentInteraction(data, interaction.client, vi.fn());
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);

            await option.handle(interaction);

            const value = await option.get(interaction.guildID);
            expect(value).toBe("!");
        });

        it("should set the value to null if the user selects nothing", async () => {
            option.nullable = true;

            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "config-enum",
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
            await option.set(interaction.guildID, 100);

            await expect(option.handle(interaction)).rejects.toThrowError(
                "The setting 'prefix' is not of type 'string'."
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
