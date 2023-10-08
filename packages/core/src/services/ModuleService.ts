import type { Awaitable } from "../types.js";
import type { Module } from "../modules/index.js";

/**
 * Represents a service for managing modules.
 */
export interface ModuleRegistry {
    /**
     * The amount of registered modules.
     */
    size: number;

    /**
     * Registers a module.
     *
     * @param module The module to register.
     */
    add(module: Module): Awaitable<void>;

    /**
     * Removes a module.
     *
     * @param id The ID of the module to remove.
     */
    delete(id: string): void;

    /**
     * Retrieve a module by its ID.
     *
     * @param id The ID of the module.
     * @returns The retrieved module, if found.
     */
    get<T extends Module>(id: string): T | undefined;
}

/**
 * Represents a service for managing modules.
 */
export class ModuleService implements ModuleRegistry {
    /**
     * The map of modules.
     */
    #modules: Map<string, Module> = new Map();

    /**
     * The amount of registered modules.
     */
    get size(): number {
        return this.#modules.size;
    }

    /**
     * Registers a module and it's commands and events.
     *
     * @param module The module to register.
     */
    async add(module: Module): Promise<void> {
        this.#modules.set(module.id, module);

        await module.initialize();

        module.registerCommands();
        module.registerEvents();
    }

    /**
     * Removes a module.
     *
     * @param id The ID of the module to remove.
     */
    delete(id: string): void {
        this.#modules.delete(id);
    }

    /**
     * Retrieve a module by it's ID.
     *
     * @param id The ID of the module.
     * @returns The retrieved module, if found.
     */
    get<T extends Module>(id: string): T | undefined {
        const [key, children] = id.split(".", 2);
        if (key === "") {
            return;
        }

        const module = this.#modules.get(key);
        if (module === undefined) {
            return;
        }

        if (children === undefined) {
            return module as T;
        }

        return module.dependencies.get(children);
    }
}
