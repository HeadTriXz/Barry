import { type API, Routes } from "@discordjs/core";

import {
    ApplicationCommandInteraction,
    AutocompleteInteraction,
    Client,
    Interaction,
    InteractionFactory,
    MessageComponentInteraction,
    ModalSubmitInteraction,
    PingInteraction
} from "../../src/index.js";
import {
    createMockApplicationCommandInteraction,
    createMockAutocompleteInteraction,
    createMockMessageComponentInteraction,
    createMockModalSubmitInteraction,
    mockPingInteraction
} from "@barry-bot/testing";

describe("Interaction", () => {
    const client = new Client({
        api: {
            rest: {
                post: vi.fn()
            }
        } as unknown as API,
        applicationID: "49072635294295155"
    });

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    describe("constructor", () => {
        it("should initialize the interaction properties correctly", () => {
            const data = createMockApplicationCommandInteraction();
            const interaction = new Interaction(data, client);

            expect(interaction.appPermissions).toBe(BigInt(data.app_permissions));
            expect(interaction.applicationID).toBe(data.application_id);
            expect(interaction.channel).toEqual(data.channel);
            expect(interaction.guildID).toBe(data.guild_id);
            expect(interaction.guildLocale).toBe(data.guild_locale);
            expect(interaction.id).toBe(data.id);
            expect(interaction.member).toEqual(data.member);
            expect(interaction.token).toBe(data.token);
            expect(interaction.type).toBe(data.type);
            expect(interaction.user).toEqual(data.member?.user);
            expect(interaction.version).toBe(1);
        });
    });

    describe("createdAt", () => {
        it("should return the timestamp of when the interaction was created", () => {
            const data = createMockApplicationCommandInteraction();
            const interaction = new Interaction(data, client);

            expect(interaction.createdAt).toBe(1439771902885);
        });
    });

    describe("createResponse", () => {
        const options = {
            body: "Hello World"
        };

        it("should send a response to the interaction", async () => {
            const data = createMockApplicationCommandInteraction();
            const interaction = new Interaction(data, client);

            await interaction.createResponse(options);

            expect(client.api.rest.post).toHaveBeenCalledOnce();
            expect(client.api.rest.post).toHaveBeenCalledWith(
                Routes.interactionCallback(interaction.id, interaction.token),
                {
                    auth: false,
                    body: "Hello World"
                }
            );
        });

        it("should throw an error if client is missing", async () => {
            const data = createMockApplicationCommandInteraction();
            const interaction = new Interaction(data);

            await expect(() => interaction.createResponse(options)).rejects.toThrowError(
                "Cannot send a response without a valid client."
            );
        });

        it("should use the provided response handler", async () => {
            const respond = vi.fn();
            const data = createMockApplicationCommandInteraction();
            const interaction = new Interaction(data, client, respond);

            await interaction.createResponse(options);

            expect(respond).toHaveBeenCalledOnce();
            expect(respond).toHaveBeenCalledWith(options);
            expect(client.api.rest.post).not.toHaveBeenCalled();
        });
    });

    describe("isApplicationCommand", () => {
        it("should return true when the interaction type is APPLICATION_COMMAND", () => {
            const data = createMockApplicationCommandInteraction();
            const interaction = new Interaction(data, client);

            expect(interaction.isApplicationCommand()).toBe(true);
        });

        it("should return false when the interaction type is not APPLICATION_COMMAND", () => {
            const data = createMockAutocompleteInteraction();
            const interaction = new Interaction(data, client);

            expect(interaction.isApplicationCommand()).toBe(false);
        });
    });

    describe("isAutocomplete", () => {
        it("should return true when the interaction type is APPLICATION_COMMAND_AUTOCOMPLETE", () => {
            const data = createMockAutocompleteInteraction();
            const interaction = new Interaction(data, client);

            expect(interaction.isAutocomplete()).toBe(true);
        });

        it("should return false when the interaction type is not APPLICATION_COMMAND_AUTOCOMPLETE", () => {
            const data = createMockMessageComponentInteraction();
            const interaction = new Interaction(data, client);

            expect(interaction.isAutocomplete()).toBe(false);
        });
    });

    describe("isInvokedInGuild", () => {
        it("should return true when 'guild_id' is present", () => {
            const data = createMockApplicationCommandInteraction();
            const interaction = new Interaction(data, client);

            expect(interaction.isInvokedInGuild()).toBe(true);
        });

        it("should return false when 'guild_id' is missing", () => {
            const data = createMockApplicationCommandInteraction();
            delete data.guild_id;

            const interaction = new Interaction(data, client);

            expect(interaction.isInvokedInGuild()).toBe(false);
        });
    });

    describe("isMessageComponent", () => {
        it("should return true when the interaction type is MESSAGE_COMPONENT", () => {
            const data = createMockMessageComponentInteraction();
            const interaction = new Interaction(data, client);

            expect(interaction.isMessageComponent()).toBe(true);
        });

        it("should return false when the interaction type is not MESSAGE_COMPONENT", () => {
            const data = createMockModalSubmitInteraction();
            const interaction = new Interaction(data, client);

            expect(interaction.isMessageComponent()).toBe(false);
        });
    });

    describe("isModalSubmit", () => {
        it("should return true when the interaction type is MODAL_SUBMIT", () => {
            const data = createMockModalSubmitInteraction();
            const interaction = new Interaction(data, client);

            expect(interaction.isModalSubmit()).toBe(true);
        });

        it("should return false when the interaction type is not MODAL_SUBMIT", () => {
            const interaction = new Interaction(mockPingInteraction, client);

            expect(interaction.isModalSubmit()).toBe(false);
        });
    });

    describe("isPing", () => {
        it("should return true when the interaction type is PING", () => {
            const interaction = new Interaction(mockPingInteraction, client);

            expect(interaction.isPing()).toBe(true);
        });

        it("should return false when the interaction type is not PING", () => {
            const data = createMockApplicationCommandInteraction();
            const interaction = new Interaction(data, client);

            expect(interaction.isPing()).toBe(false);
        });
    });
});

describe("InteractionFactory", () => {
    const client = new Client({
        api: {} as API,
        applicationID: "49072635294295155"
    });

    describe("from", () => {
        it("should return the right subclass", () => {
            expect(InteractionFactory.from(createMockApplicationCommandInteraction(), client))
                .toBeInstanceOf(ApplicationCommandInteraction);

            expect(InteractionFactory.from(createMockAutocompleteInteraction(), client))
                .toBeInstanceOf(AutocompleteInteraction);

            expect(InteractionFactory.from(createMockMessageComponentInteraction(), client))
                .toBeInstanceOf(MessageComponentInteraction);

            expect(InteractionFactory.from(createMockModalSubmitInteraction(), client))
                .toBeInstanceOf(ModalSubmitInteraction);

            expect(InteractionFactory.from(mockPingInteraction, client, vi.fn()))
                .toBeInstanceOf(PingInteraction);
        });

        it("should return the base class for unknown types", () => {
            const mockUnknownInteraction = {
                ...mockPingInteraction,
                type: 26
            };

            const interaction = InteractionFactory.from(mockUnknownInteraction, client);
            expect(interaction).toBeInstanceOf(Interaction);
        });
    });
});
