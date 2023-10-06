import { type API, InteractionType, GatewayDispatchEvents } from "@discordjs/core";

import {
    ApplicationCommandInteraction,
    ApplicationCommandInteractionHandler,
    AutocompleteInteractionHandler,
    Client,
    InteractionService,
    PingInteractionHandler
} from "../../../src/index.js";
import { createMockApplicationCommandInteraction } from "@barry/testing";

describe("InteractionService", () => {
    let client: Client;
    let interactions: InteractionService;

    beforeEach(async () => {
        client = new Client({
            api: {} as API,
            applicationID: "49072635294295155"
        });

        interactions = new InteractionService(client);

        await client.initialize();
    });

    describe("constructor", () => {
        it("should initialize the handlers for different interaction types", () => {
            expect(interactions.handlers[InteractionType.ApplicationCommand]).toBeInstanceOf(
                ApplicationCommandInteractionHandler
            );
            expect(interactions.handlers[InteractionType.ApplicationCommandAutocomplete]).toBeInstanceOf(
                AutocompleteInteractionHandler
            );
            expect(interactions.handlers[InteractionType.Ping]).toBeInstanceOf(PingInteractionHandler);
        });
    });

    describe("addMiddleware", () => {
        it("should add the middleware to the interaction handler", async () => {
            const data = createMockApplicationCommandInteraction();
            const interaction = new ApplicationCommandInteraction(data, client);
            const middleware = vi.fn();

            interactions.addMiddleware(middleware);
            await interactions.handle(interaction);

            expect(middleware).toHaveBeenCalledOnce();
        });
    });

    describe("handle", () => {
        it("should call the corresponding handler for the interaction", async () => {
            const data = createMockApplicationCommandInteraction();
            const interaction = new ApplicationCommandInteraction(data, client);
            const handler = vi.fn();

            interactions.handlers[InteractionType.ApplicationCommand]!.handle = handler;

            await interactions.handle(interaction);

            expect(handler).toHaveBeenCalledOnce();
            expect(handler).toHaveBeenCalledWith(interaction);
        });

        it("should call the middleware chain in the correct order", async () => {
            const data = createMockApplicationCommandInteraction();
            const interaction = new ApplicationCommandInteraction(data, client);
            const results: number[] = [];

            interactions.addMiddleware(async (interaction, next) => {
                results.push(1);
                await next();
                results.push(7);
            });

            interactions.addMiddleware(async (interaction, next) => {
                results.push(2);
                await next();
                results.push(6);
            });

            interactions.addMiddleware(async (interaction, next) => {
                results.push(3);
                await next();
                results.push(5);
            });

            interactions.handlers[InteractionType.ApplicationCommand]!.handle = () => {
                results.push(4);
            };

            await interactions.handle(interaction);

            expect(results).toEqual([1, 2, 3, 4, 5, 6, 7]);
        });

        it("should emit the 'InteractionCreate' event if the interaction is valid", async () => {
            const data = createMockApplicationCommandInteraction();
            const interaction = new ApplicationCommandInteraction(data, client);
            const emitSpy = vi.spyOn(client, "emit");

            await interactions.handle(interaction);

            expect(emitSpy).toHaveBeenCalledOnce();
            expect(emitSpy).toHaveBeenCalledWith(GatewayDispatchEvents.InteractionCreate, interaction);
        });

        it("should not emit the 'InteractionCreate' event if the interaction is invalid", async () => {
            const data = createMockApplicationCommandInteraction();
            const interaction = new ApplicationCommandInteraction(data, client);
            const emitSpy = vi.spyOn(client, "emit");

            interactions.addMiddleware(() => {
                return;
            });

            await interactions.handle(interaction);

            expect(emitSpy).not.toHaveBeenCalled();
        });
    });
});
