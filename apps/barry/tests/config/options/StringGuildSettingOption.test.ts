import {
    type GuildInteraction,
    ModalSubmitInteraction,
    UpdatableInteraction
} from "@barry-bot/core";
import { ComponentType, MessageFlags } from "@discordjs/core";
import {
    createMockMessageComponentInteraction,
    createMockModalSubmitInteraction
} from "@barry-bot/testing";
import { GuildSettingType } from "../../../src/config/option.js";
import { GuildSettingsStore } from "../../../src/config/store.js";
import { StringGuildSettingOption } from "../../../src/config/options/StringGuildSettingOption.js";
import { createMockApplication } from "../../mocks/index.js";
import { timeoutContent } from "../../../src/common.js";

describe("StringGuildSettingOption", () => {
    let interaction: GuildInteraction<UpdatableInteraction>;
    let option: StringGuildSettingOption<any, any>;

    beforeEach(() => {
        const client = createMockApplication();
        const data = createMockMessageComponentInteraction();
        interaction = new UpdatableInteraction(data, client, vi.fn()) as GuildInteraction<UpdatableInteraction>;
        interaction.createModal = vi.fn();
        interaction.editParent = vi.fn();

        option = new StringGuildSettingOption({
            name: "Prefix",
            description: "The prefix to use for commands."
        });

        option.key = "prefix";
        option.store = new GuildSettingsStore();
    });

    describe("constructor", () => {
        it("should set the type to 'String'", () => {
            expect(option.type).toBe(GuildSettingType.String);
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
            await option.set(interaction.guildID, "!");

            const value = await option.getValue(interaction);

            expect(value).toBe("``!``");
        });

        it("should return 'None' if the value is undefined", async () => {
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
                        custom_id: "string",
                        type: ComponentType.TextInput,
                        value: "!"
                    }],
                    type: ComponentType.ActionRow
                }],
                custom_id: `config-string-${Date.now()}`
            });
            response = new ModalSubmitInteraction(data, interaction.client, vi.fn());
            response.createMessage = vi.fn();

            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(response);

            await option.set(interaction.guildID, "!");
        });

        it("should set the value to '?' if the user submits '?'", async () => {
            response.values.string = "?";

            await option.handle(interaction);

            const value = await option.get(interaction.guildID);
            expect(value).toBe("?");
        });

        it("should set the value to null if the user submits nothing", async () => {
            response.values.string = "";

            await option.handle(interaction);

            const value = await option.get(interaction.guildID);
            expect(value).toBeNull();
        });

        it("should use the configured maximum length", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);
            option.maximum = 50;

            await option.handle(interaction);

            expect(interaction.createModal).toHaveBeenCalledOnce();
            expect(interaction.createModal).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: [{
                        components: [
                            expect.objectContaining({
                                max_length: 50
                            })
                        ],
                        type: ComponentType.ActionRow
                    }]
                })
            );
        });

        it("should use the configured minimum length", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);
            option.minimum = 1;

            await option.handle(interaction);

            expect(interaction.createModal).toHaveBeenCalledOnce();
            expect(interaction.createModal).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: [{
                        components: [
                            expect.objectContaining({
                                min_length: 1
                            })
                        ],
                        type: ComponentType.ActionRow
                    }]
                })
            );
        });

        it("should send an error message if the value is too short", async () => {
            option.minimum = 10;
            option.nullable = true;
            response.values.string = "Hi";

            await option.handle(interaction);

            expect(response.createMessage).toHaveBeenCalledOnce();
            expect(response.createMessage).toHaveBeenCalledWith({
                content: expect.stringContaining("The value you entered is too short."),
                flags: MessageFlags.Ephemeral
            });
        });

        it("should send a timeout message if the user does not respond", async () => {
            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(undefined);

            await option.handle(interaction);

            expect(interaction.editParent).toHaveBeenCalledOnce();
            expect(interaction.editParent).toHaveBeenCalledWith(timeoutContent);
        });

        it("should throw an error if the value is not a string", async () => {
            await option.set(interaction.guildID, 1);

            await expect(() => option.handle(interaction)).rejects.toThrowError(
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
