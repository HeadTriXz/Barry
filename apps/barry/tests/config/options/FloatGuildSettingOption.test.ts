import {
    type GuildInteraction,
    ModalSubmitInteraction,
    UpdatableInteraction
} from "@barry/core";

import { ComponentType, MessageFlags } from "@discordjs/core";
import {
    createMockMessageComponentInteraction,
    createMockModalSubmitInteraction
} from "@barry/testing";
import { FloatGuildSettingOption } from "../../../src/config/options/FloatGuildSettingOption.js";
import { GuildSettingType } from "../../../src/config/option.js";
import { GuildSettingsStore } from "../../../src/config/store.js";
import { createMockApplication } from "../../mocks/index.js";
import { timeoutContent } from "../../../src/common.js";

describe("FloatGuildSettingOption", () => {
    let interaction: GuildInteraction<UpdatableInteraction>;
    let option: FloatGuildSettingOption<any, any>;

    beforeEach(() => {
        const client = createMockApplication();
        const data = createMockMessageComponentInteraction();
        interaction = new UpdatableInteraction(data, client, vi.fn()) as GuildInteraction<UpdatableInteraction>;
        interaction.createModal = vi.fn();
        interaction.editParent = vi.fn();

        option = new FloatGuildSettingOption({
            name: "Chance",
            description: "The chance to ban all users."
        });

        option.key = "chance";
        option.store = new GuildSettingsStore();
    });

    describe("constructor", () => {
        it("should set the type to 'Float'", () => {
            expect(option.type).toBe(GuildSettingType.Float);
        });

        it("should set the 'onEdit' callback to 'handle' by default", async () => {
            const handleSpy = vi.spyOn(option, "handle").mockResolvedValue();

            await option.onEdit(option, interaction);

            expect(handleSpy).toHaveBeenCalledOnce();
            expect(handleSpy).toHaveBeenCalledWith(interaction);
        });

        it("should set the 'onView' callback to 'getValue' by default", async () => {
            const getValueSpy = vi.spyOn(option, "getValue").mockResolvedValue("0.5");

            await option.onView(option, interaction);

            expect(getValueSpy).toHaveBeenCalledOnce();
            expect(getValueSpy).toHaveBeenCalledWith(interaction);
        });
    });

    describe("getValue", () => {
        it("should return '0.5' if the value is 0.5", async () => {
            await option.set(interaction.guildID, 0.5);

            const value = await option.getValue(interaction);
            expect(value).toBe("``0.5``");
        });

        it("should return 'None' if the value is null", async () => {
            await option.set(interaction.guildID, null);

            const value = await option.getValue(interaction);
            expect(value).toBe("`None`");
        });
    });

    describe("handle", () => {
        let response: ModalSubmitInteraction;

        beforeEach(async () => {
            vi.useFakeTimers().setSystemTime("01-01-2023");
            const data = createMockModalSubmitInteraction({
                components: [{
                    components: [{
                        custom_id: "float",
                        type: ComponentType.TextInput,
                        value: "0.5"
                    }],
                    type: ComponentType.ActionRow
                }],
                custom_id: `config-float-${Date.now()}`
            });
            response = new ModalSubmitInteraction(data, interaction.client, vi.fn());
            response.createMessage = vi.fn();

            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(response);

            await option.set(interaction.guildID, 0.5);
        });

        it("should set the value to '0.7' if the user responds with '0.7'", async () => {
            response.values.float = "0.7";

            await option.handle(interaction);

            const value = await option.get(interaction.guildID);
            expect(value).toBe(0.7);
        });

        it("should set the value to null if the user responds with nothing", async () => {
            option.nullable = true;
            response.values.float = "";

            await option.handle(interaction);

            const value = await option.get(interaction.guildID);
            expect(value).toBe(null);
        });

        it("should send an error message if the input is not a number", async () => {
            response.values.float = "random";

            await option.handle(interaction);

            expect(response.createMessage).toHaveBeenCalledOnce();
            expect(response.createMessage).toHaveBeenCalledWith({
                content: expect.stringContaining("The value you entered is not a float."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should send an error message if the input is less than the minimum", async () => {
            option.minimum = 0.6;
            response.values.float = "0.5";

            await option.handle(interaction);

            expect(response.createMessage).toHaveBeenCalledOnce();
            expect(response.createMessage).toHaveBeenCalledWith({
                content: expect.stringContaining("The value you entered is too small."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should send an error message if the input is greater than the maximum", async () => {
            option.maximum = 0.4;
            response.values.float = "0.5";

            await option.handle(interaction);

            expect(response.createMessage).toHaveBeenCalledOnce();
            expect(response.createMessage).toHaveBeenCalledWith({
                content: expect.stringContaining("The value you entered is too large."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should send an error message if the setting is not nullable and the input is empty", async () => {
            option.nullable = false;
            response.values.float = "";

            await option.handle(interaction);

            expect(response.createMessage).toHaveBeenCalledOnce();
            expect(response.createMessage).toHaveBeenCalledWith({
                content: expect.stringContaining("The value you entered is not a float."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should send a timeout message if the user does not respond", async () => {
            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(undefined);

            await option.handle(interaction);

            expect(interaction.editParent).toHaveBeenCalledOnce();
            expect(interaction.editParent).toHaveBeenCalledWith(timeoutContent);
        });

        it("should throw an error if the value is not a number", async () => {
            await option.set(interaction.guildID, "random");

            await expect(() => option.handle(interaction)).rejects.toThrowError(
                "The setting 'chance' is not of type 'number'."
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
