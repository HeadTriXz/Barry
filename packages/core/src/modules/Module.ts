import {
    type AnyCommand,
    type Client,
    type Event,
    type ModuleRegistry,
    ModuleService
} from "../index.js";
import type { Awaitable, ConcreteConstructor } from "../types.js";

/**
 * Represents an awaitable array of constructor functions.
 */
export type ConstructorArray<T> = Awaitable<Array<ConcreteConstructor<T>>>;

/**
 * Represents the options for a module.
 */
export interface ModuleOptions<T extends Client = Client> {
    /**
     * The commands associated with the module.
     */
    commands?: ConstructorArray<AnyCommand>;

    /**
     * The dependencies of the module.
     */
    dependencies?: ConstructorArray<Module<T>>;

    /**
     * The description of the module.
     */
    description: string;

    /**
     * The events associated with the module.
     */
    events?: ConstructorArray<Event>;

    /**
     * The identifier of the module.
     */
    id: string;

    /**
     * The name of the module.
     */
    name: string;
}

/**
 * Represents a basic module.
 * @abstract
 */
export abstract class Module<T extends Client = Client> {
    /**
     * The client that initialized the module.
     */
    client: T;

    /**
     * The commands associated with the module.
     */
    commands: AnyCommand[] = [];

    /**
     * The dependencies of the module.
     */
    dependencies: ModuleRegistry = new ModuleService();

    /**
     * The description of the module.
     */
    description: string;

    /**
     * The events associated with the module.
     */
    events: Event[] = [];

    /**
     * The identifier of the module.
     */
    id: string;

    /**
     * The name of the module.
     */
    name: string;

    /**
     * The options for the module.
     */
    #options: ModuleOptions<T>;

    /**
     * The registered commands associated with the module.
     */
    #registeredCommands: Set<AnyCommand> = new Set();

    /**
     * The registered events associated with the module.
     */
    #registeredEvents: Set<Event> = new Set();

    /**
     * Represents a basic module.
     *
     * @param client The client that initialized the module.
     * @param options The options for the module.
     */
    constructor(client: T, options: ModuleOptions<T>) {
        this.client = client;
        this.description = options.description;
        this.id = options.id;
        this.name = options.name;
        this.#options = options;
    }

    /**
     * Initializes the module.
     */
    async initialize(): Promise<void> {
        if (this.#options.dependencies !== undefined) {
            await this.#loadDependencies(this.#options.dependencies);
        }

        if (this.#options.commands !== undefined) {
            await this.#loadCommands(this.#options.commands);
        }

        if (this.#options.events !== undefined) {
            await this.#loadEvents(this.#options.events);
        }
    }

    /**
     * Registers the commands associated with the module.
     */
    registerCommands(): void {
        for (const command of this.commands) {
            if (this.#registeredCommands.has(command)) {
                continue;
            }

            this.client.commands.add(command);
            this.#registeredCommands.add(command);
        }
    }

    /**
     * Registers the events associated with the module.
     */
    registerEvents(): void {
        for (const event of this.events) {
            if (this.#registeredEvents.has(event)) {
                continue;
            }

            this.client.on(event.name, event.execute.bind(event));
            this.#registeredEvents.add(event);
        }
    }

    /**
     * Loads the commands associated with the module.
     *
     * @param commands The commands to load.
     * @private
     */
    async #loadCommands(commands: ConstructorArray<AnyCommand>): Promise<void> {
        for (const CommandClass of await commands) {
            this.commands.push(new CommandClass(this));
        }
    }

    /**
     * Loads the dependencies associated with the module.
     *
     * @param dependencies The dependencies to load.
     * @private
     */
    async #loadDependencies(dependencies: ConstructorArray<Module<T>>): Promise<void> {
        const modules = await dependencies;
        await Promise.all(
            modules.map((ModuleClass) => this.dependencies.add(new ModuleClass(this.client)))
        );
    }

    /**
     * Loads the events associated with the module.
     *
     * @param events The events to load.
     * @private
     */
    async #loadEvents(events: ConstructorArray<Event>): Promise<void> {
        for (const EventClass of await events) {
            this.events.push(new EventClass(this));
        }
    }
}
