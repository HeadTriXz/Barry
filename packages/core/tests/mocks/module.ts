import {
    type Client,
    type ConcreteConstructor,
    type ModuleOptions,
    Module
} from "../../src/index.js";

/**
 * Creates a mock module class based on the provided options.
 *
 * @param options The options for the mock module.
 * @returns The mock module class.
 */
export function createMockModule(options: ModuleOptions): ConcreteConstructor<Module> {
    return class extends Module {
        constructor(client: Client) {
            super(client, options);
        }
    };
}

export const mockModuleOptions: ModuleOptions = {
    id: "mock",
    name: "Mock",
    description: "Mock module for testing purposes"
};

/**
 * Represents a mock module with no functionality.
 */
export class MockModule extends Module {
    constructor(client: Client, options: Partial<ModuleOptions> = {}) {
        super(client, {
            ...mockModuleOptions,
            ...options
        });
    }
}
