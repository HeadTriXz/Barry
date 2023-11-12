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
import { IntegerGuildSettingOption } from "../../../src/config/options/IntegerGuildSettingOption.js";
import { GuildSettingType } from "../../../src/config/option.js";
import { createMockApplication } from "../../mocks/index.js";
import { timeoutContent } from "../../../src/common.js";

describe("IntegerGuildSettingOption", () => {
    let interaction: GuildInteraction<UpdatableInteraction>;
    let option: IntegerGuildSettingOption<any, any>;

    beforeEach(() => {
        const client = createMockApplication();
        const data = createMockMessageComponentInteraction();
        interaction = new UpdatableInteraction(data, client, vi.fn()) as GuildInteraction<UpdatableInteraction>;
        interaction.createModal = vi.fn();
        interaction.editParent = vi.fn();

        option = new IntegerGuildSettingOption({
            name: "Count",
            description: "The number of users to ban."
        });

        option.store.setKey("count");
    });

    describe("constructor", () => {
        it("should set the type to 'Integer'", () => {
            expect(option.type).toBe(GuildSettingType.Integer);
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
        it("should return '42' if the value is 42", async () => {
            await option.store.set(interaction.guildID, 42);

            const value = await option.getValue(interaction);
            expect(value).toBe("``42``");
        });

        it("should return 'None' if the value is null", async () => {
            await option.store.set(interaction.guildID, null);

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
                        custom_id: "integer",
                        type: ComponentType.TextInput,
                        value: "15"
                    }],
                    type: ComponentType.ActionRow
                }],
                custom_id: `config-integer-${Date.now()}`
            });
            response = new ModalSubmitInteraction(data, interaction.client, vi.fn());
            response.createMessage = vi.fn();

            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(response);

            await option.store.set(interaction.guildID, 15);
        });

        it("should set the value to '42' if the user responds with '42'", async () => {
            response.values.integer = "42";

            await option.handle(interaction);

            const value = await option.store.get(interaction.guildID);
            expect(value).toBe(42);
        });

        it("should set the value to null if the user responds with nothing", async () => {
            option.nullable = true;
            response.values.integer = "";

            await option.handle(interaction);

            const value = await option.store.get(interaction.guildID);
            expect(value).toBe(null);
        });

        it("should send an error message if the input is not a number", async () => {
            response.values.integer = "random";

            await option.handle(interaction);

            expect(response.createMessage).toHaveBeenCalledOnce();
            expect(response.createMessage).toHaveBeenCalledWith({
                content: expect.stringContaining("The value you entered is not an integer."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should send an error message if the input is not an integer", async () => {
            response.values.integer = "0.5";

            await option.handle(interaction);

            expect(response.createMessage).toHaveBeenCalledOnce();
            expect(response.createMessage).toHaveBeenCalledWith({
                content: expect.stringContaining("The value you entered is not an integer."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should send an error message if the input is less than the minimum", async () => {
            option.minimum = 10;
            response.values.integer = "5";

            await option.handle(interaction);

            expect(response.createMessage).toHaveBeenCalledOnce();
            expect(response.createMessage).toHaveBeenCalledWith({
                content: expect.stringContaining("The value you entered is too small."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should send an error message if the input is greater than the maximum", async () => {
            option.maximum = 10;
            response.values.integer = "15";

            await option.handle(interaction);

            expect(response.createMessage).toHaveBeenCalledOnce();
            expect(response.createMessage).toHaveBeenCalledWith({
                content: expect.stringContaining("The value you entered is too large."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should send an error message if the setting is not nullable and the input is empty", async () => {
            option.nullable = false;
            response.values.integer = "";

            await option.handle(interaction);

            expect(response.createMessage).toHaveBeenCalledOnce();
            expect(response.createMessage).toHaveBeenCalledWith({
                content: expect.stringContaining("The value you entered is not an integer."),
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
            await option.store.set(interaction.guildID, "random");

            await expect(() => option.handle(interaction)).rejects.toThrowError(
                "The setting 'count' is not of type 'number'."
            );
        });

        it("should not throw an error if the value is null and the setting is nullable", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);
            option.nullable = true;

            await option.store.set(interaction.guildID, null);

            await expect(option.handle(interaction)).resolves.not.toThrowError();
        });
    });
});
