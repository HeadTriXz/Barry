import {
    type AnyCommand,
    type Client,
    type ConcreteConstructor,
    type Constructor,
    BaseCommand,
    Event,
    Module
} from "@barry/core";

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import fs from "node:fs/promises";

/**
 * A promise resolving into an array of constructor functions.
 */
type LoadedFiles<T> = Promise<Array<ConcreteConstructor<T>>>;

/**
 * Represents an imported file.
 */
interface ImportedFile<T> {
    /**
     * The default export.
     */
    default: ConcreteConstructor<T>;
}

/**
 * Gets the path of the file that called the function.
 *
 * @returns The caller path.
 */
function getCallerPath(): string {
    const prepareStackTrace = Error.prepareStackTrace;
    Error.prepareStackTrace = (error, stack) => stack;

    const stack = new Error()
        .stack as unknown as NodeJS.CallSite[];

    Error.prepareStackTrace = prepareStackTrace;

    const path = stack[2].getFileName()!;
    if (path.startsWith("file:///")) {
        return fileURLToPath(path);
    }

    return path;
}

/**
 * Loads files from the specified folder and filters them based on the provided base class.
 *
 * @param path The folder to load the files from.
 * @param base The base class used to filter the found files.
 * @param callerPath The path the the caller file.
 * @param loadAll Whether to load all files or only "index.ts" files.
 * @returns An array of loaded files.
 */
async function loadFromCallerPath<T>(
    path: string,
    base: Constructor<T>,
    callerPath: string,
    loadAll: boolean
): LoadedFiles<T> {
    const fullPath = resolve(callerPath, "..", path);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    if (entries.length === 0) {
        return [];
    }

    const files = entries.filter((e) => e.isFile() && (loadAll ? e.name.endsWith(".js") : e.name === "index.js"));
    const items = await Promise.all(
        files.map((f) => import(resolve(fullPath, f.name)) as Promise<ImportedFile<T>>)
    );

    const filtered = items
        .filter(({ default: item }) => item?.prototype instanceof base)
        .map(({ default: item }) => item);

    if (filtered.length > 0 && !loadAll) {
        return filtered;
    }

    const folders = entries.filter((e) => e.isDirectory());
    const nestedItems = await Promise.all(
        folders.map((f) => loadFromCallerPath(resolve(fullPath, f.name), base, callerPath, loadAll))
    );

    return filtered.concat(...nestedItems);
}

/**
 * Loads all commands from the specified folder.
 *
 * @param path The folder to load the commands from.
 * @returns An array of loaded commands.
 */
export async function loadCommands(path: string): LoadedFiles<AnyCommand> {
    return loadFromCallerPath(path, BaseCommand as Constructor<AnyCommand>, getCallerPath(), false);
}

/**
 * Loads all events from the specified folder.
 *
 * @param path The folder to load the events from.
 * @returns An array of loaded events.
 */
export async function loadEvents(path: string): LoadedFiles<Event> {
    return loadFromCallerPath(path, Event, getCallerPath(), true);
}

/**
 * Loads files from the specified folder and filters them based on the provided base class.
 *
 * @param path The folder to load the files from.
 * @param base The base class used to filter the found files.
 * @param loadAll Whether to load all files or only "index.js" files.
 * @returns An array of loaded files.
 */
export async function loadFolder<T>(path: string, base: Constructor<T>, loadAll: boolean): LoadedFiles<T> {
    return loadFromCallerPath(path, base, getCallerPath(), loadAll);
}

/**
 * Loads all modules from the specified folder.
 *
 * @param path The folder to load the modules from.
 * @returns An array of loaded modules.
 */
export async function loadModules<T extends Client = Client>(path: string): LoadedFiles<Module<T>> {
    return loadFromCallerPath(path, Module, getCallerPath(), false);
}
