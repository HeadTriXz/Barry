import { type API } from "@discordjs/core";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Client, ModuleService } from "../../src/index.js";
import { MockModule } from "../mocks/index.js";

describe("ModuleService", () => {
    let client: Client;
    let modules: ModuleService;

    beforeEach(() => {
        client = new Client({
            api: {} as API,
            applicationID: "49072635294295155"
        });

        modules = new ModuleService();
    });

    describe("add", () => {
        it("should register a module", async () => {
            const module = new MockModule(client);
            await modules.add(module);

            expect(modules.size).toBe(1);
            expect(modules.get("mock")).toBe(module);
        });

        it("should invoke module initialization and registration methods", async () => {
            const module = new MockModule(client);

            const initializeSpy = vi.spyOn(module, "initialize");
            const registerCommandsSpy = vi.spyOn(module, "registerCommands");
            const registerEventsSpy = vi.spyOn(module, "registerEvents");

            await modules.add(module);

            expect(initializeSpy).toHaveBeenCalledOnce();
            expect(registerCommandsSpy).toHaveBeenCalledOnce();
            expect(registerEventsSpy).toHaveBeenCalledOnce();
        });
    });

    describe("delete", () => {
        it("should remove a registered module", async () => {
            const module = new MockModule(client);
            await modules.add(module);

            modules.delete("mock");

            expect(modules.size).toBe(0);
            expect(modules.get("mock")).toBeUndefined();
        });

        it("should not remove an unknown module", async () => {
            const module = new MockModule(client);
            await modules.add(module);

            modules.delete("unknown");

            expect(modules.size).toBe(1);
            expect(modules.get("mock")).toBe(module);
        });
    });

    describe("get", () => {
        it("should return a registered module by it's ID", async () => {
            const module = new MockModule(client);
            await modules.add(module);

            expect(modules.get("mock")).toBe(module);
        });

        it("should return undefined if not found", async () => {
            const module = new MockModule(client);
            await modules.add(module);

            expect(modules.size).toBe(1);
            expect(modules.get("unknown")).toBeUndefined();
        });
    });
});
