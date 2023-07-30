import type { Dirent } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadCommands, loadEvents, loadFolder, loadModules } from "../../src/utils/index.js";
import { BaseCommand, Event, Module, SlashCommand } from "@barry/core";

import fs from "node:fs/promises";

import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

class MockCommand extends SlashCommand {
    async execute(): Promise<void> {
        // empty.
    }
}

class MockEvent extends Event {
    async execute(): Promise<void> {
        // empty.
    }
}

class MockModule extends Module {}

vi.mock("node:fs/promises");

describe("loadFolder", () => {
    function createMockFile(name: string): Dirent {
        return {
            isDirectory: vi.fn().mockReturnValue(false),
            isFile: vi.fn().mockReturnValue(true),
            name: name
        } as unknown as Dirent;
    }

    function createMockFolder(name: string): Dirent {
        return {
            isDirectory: vi.fn().mockReturnValue(true),
            isFile: vi.fn().mockReturnValue(false),
            name: name
        } as unknown as Dirent;
    }

    function getFullPath(path: string): string {
        return resolve(fileURLToPath(import.meta.url), "..", path);
    }

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    describe("loadFolder", () => {
        it("should return an empty array if the folder is empty", async () => {
            vi.mocked(fs.readdir).mockResolvedValue([]);

            const path = "/path/to/folder";
            const commands = await loadFolder(path, BaseCommand, false);

            expect(commands.length).toBe(0);
            expect(fs.readdir).toHaveBeenCalledOnce();
            expect(fs.readdir).toHaveBeenCalledWith(getFullPath(path), { withFileTypes: true });
        });

        it("should load a single file if the index.js file is found", async () => {
            const file = createMockFile("index.js");

            const path = "/path/to/folder";
            const fullPath = getFullPath(path);

            vi.mocked(fs.readdir).mockResolvedValue([file]);
            vi.doMock(resolve(fullPath, file.name), () => ({
                default: MockCommand
            }));

            const commands = await loadFolder(path, BaseCommand, false);

            expect(commands).toEqual([MockCommand]);
            expect(fs.readdir).toHaveBeenCalledOnce();
            expect(fs.readdir).toHaveBeenCalledWith(fullPath, { withFileTypes: true });
        });

        it("should ignore files that are not instances of the base class", async () => {
            const file = createMockFile("index.js");

            const path = "/path/to/folder";
            const fullPath = getFullPath(path);

            vi.mocked(fs.readdir).mockResolvedValue([file]);
            vi.doMock(resolve(fullPath, file.name), () => ({
                default: MockEvent
            }));

            const commands = await loadFolder(path, BaseCommand, false);

            expect(commands.length).toBe(0);
            expect(fs.readdir).toHaveBeenCalledOnce();
            expect(fs.readdir).toHaveBeenCalledWith(fullPath, { withFileTypes: true });
        });

        it("should load files from subfolders recursively", async () => {
            const file = createMockFile("index.js");
            const folderFoo = createMockFolder("foo");
            const folderBar = createMockFolder("bar");

            const path = "/path/to/folder";
            const fullPath = getFullPath(path);

            vi.mocked(fs.readdir)
                .mockResolvedValueOnce([folderFoo, folderBar])
                .mockResolvedValue([file]);

            vi.doMock(resolve(fullPath, folderFoo.name, file.name), () => ({
                default: MockCommand
            }));

            vi.doMock(resolve(fullPath, folderBar.name, file.name), () => ({
                default: MockCommand
            }));

            const commands = await loadFolder(path, BaseCommand, false);

            expect(commands.length).toBe(2);
            expect(fs.readdir).toHaveBeenCalledTimes(3);
            expect(fs.readdir).toHaveBeenCalledWith(fullPath, { withFileTypes: true });
            expect(fs.readdir).toHaveBeenCalledWith(resolve(fullPath, folderBar.name), { withFileTypes: true });
            expect(fs.readdir).toHaveBeenCalledWith(resolve(fullPath, folderFoo.name), { withFileTypes: true });
        });

        it("should return an empty array if the folder does not contain an index.js file", async () => {
            const file = createMockFile("not-index.js");
            const folder = createMockFolder("foo");

            const path = "/path/to/folder";
            const fullPath = getFullPath(path);

            vi.mocked(fs.readdir)
                .mockResolvedValueOnce([folder])
                .mockResolvedValue([file]);

            const commands = await loadFolder(path, BaseCommand, false);

            expect(commands.length).toBe(0);
            expect(fs.readdir).toHaveBeenCalledTimes(2);
            expect(fs.readdir).toHaveBeenCalledWith(fullPath, { withFileTypes: true });
            expect(fs.readdir).toHaveBeenCalledWith(resolve(fullPath, folder.name), { withFileTypes: true });
        });
    });

    describe("loadCommands", () => {
        it("should ignore files that are not commands", async () => {
            const file = createMockFile("index.js");
            const folderFoo = createMockFolder("foo");
            const folderBar = createMockFolder("bar");

            const path = "/path/to/folder";
            const fullPath = getFullPath(path);

            vi.mocked(fs.readdir)
                .mockResolvedValueOnce([folderFoo, folderBar])
                .mockResolvedValue([file]);

            vi.doMock(resolve(fullPath, folderFoo.name, file.name), () => ({
                default: MockEvent
            }));

            vi.doMock(resolve(fullPath, folderBar.name, file.name), () => ({
                default: MockCommand
            }));

            const commands = await loadCommands(path);

            expect(commands).toEqual([MockCommand]);
            expect(fs.readdir).toHaveBeenCalledTimes(3);
            expect(fs.readdir).toHaveBeenCalledWith(fullPath, { withFileTypes: true });
            expect(fs.readdir).toHaveBeenCalledWith(resolve(fullPath, folderBar.name), { withFileTypes: true });
            expect(fs.readdir).toHaveBeenCalledWith(resolve(fullPath, folderFoo.name), { withFileTypes: true });
        });
    });

    describe("loadEvents", () => {
        it("should ignore files that are not events", async () => {
            const file = createMockFile("index.js");
            const folderFoo = createMockFolder("foo");
            const folderBar = createMockFolder("bar");

            const path = "/path/to/folder";
            const fullPath = getFullPath(path);

            vi.mocked(fs.readdir)
                .mockResolvedValueOnce([folderFoo, folderBar])
                .mockResolvedValue([file]);

            vi.doMock(resolve(fullPath, folderFoo.name, file.name), () => ({
                default: MockEvent
            }));

            vi.doMock(resolve(fullPath, folderBar.name, file.name), () => ({
                default: MockCommand
            }));

            const events = await loadEvents(path);

            expect(events).toEqual([MockEvent]);
            expect(fs.readdir).toHaveBeenCalledTimes(3);
            expect(fs.readdir).toHaveBeenCalledWith(fullPath, { withFileTypes: true });
            expect(fs.readdir).toHaveBeenCalledWith(resolve(fullPath, folderBar.name), { withFileTypes: true });
            expect(fs.readdir).toHaveBeenCalledWith(resolve(fullPath, folderFoo.name), { withFileTypes: true });
        });
    });

    describe("loadModules", () => {
        it("should ignore files that are not modules", async () => {
            const file = createMockFile("index.js");
            const folderFoo = createMockFolder("foo");
            const folderBar = createMockFolder("bar");

            const path = "/path/to/folder";
            const fullPath = getFullPath(path);

            vi.mocked(fs.readdir)
                .mockResolvedValueOnce([folderFoo, folderBar])
                .mockResolvedValue([file]);

            vi.doMock(resolve(fullPath, folderFoo.name, file.name), () => ({
                default: MockModule
            }));

            vi.doMock(resolve(fullPath, folderBar.name, file.name), () => ({
                default: MockCommand
            }));

            const modules = await loadModules(path);

            expect(modules).toEqual([MockModule]);
            expect(fs.readdir).toHaveBeenCalledTimes(3);
            expect(fs.readdir).toHaveBeenCalledWith(fullPath, { withFileTypes: true });
            expect(fs.readdir).toHaveBeenCalledWith(resolve(fullPath, folderBar.name), { withFileTypes: true });
            expect(fs.readdir).toHaveBeenCalledWith(resolve(fullPath, folderFoo.name), { withFileTypes: true });
        });
    });
});
