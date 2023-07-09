import {
    type AnyCommand,
    type ConcreteConstructor,
    type Constructor,
    BaseCommand,
    Event,
    Module
} from "@barry/core";

import fs from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
 * @returns An array of loaded files.
 */
export async function loadFolder<T>(path: string, base: Constructor<T>): LoadedFiles<T> {
    return loadFromCallerPath(path, base, getCallerPath());
}

/**
 * Loads files from the specified folder and filters them based on the provided base class.
 *
 * @param path The folder to load the files from.
 * @param base The base class used to filter the found files.
 * @param callerPath The path the the caller file.
 * @returns An array of loaded files.
 */
async function loadFromCallerPath<T>(path: string, base: Constructor<T>, callerPath: string): LoadedFiles<T> {
    const fullPath = resolve(callerPath, "..", path);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    if (entries.length === 0) {
        return [];
    }

    const file = entries.find((e) => e.isFile() && e.name === "index.js");
    if (file !== undefined) {
        const { default: item } = await import(resolve(fullPath, file.name)) as ImportedFile<T>;
        if (!(item?.prototype instanceof base)) {
            return [];
        }

        return [item];
    }

    const folders = entries.filter((e) => e.isDirectory());
    if (folders.length === 0) {
        return [];
    }

    const items = await Promise.all(
        folders.map((f) => loadFromCallerPath(resolve(fullPath, f.name), base, callerPath))
    );

    return items.flat();
}

/**
 * Loads all commands from the specified folder.
 *
 * @param path The folder to load the commands from.
 * @param callerPath The path the the caller file.
 * @returns An array of loaded commands.
 */
export async function loadCommands(path: string): LoadedFiles<AnyCommand> {
    return loadFromCallerPath(path, BaseCommand as Constructor<AnyCommand>, getCallerPath());
}

/**
 * Loads all events from the specified folder.
 *
 * @param path The folder to load the events from.
 * @param callerPath The path the the caller file.
 * @returns An array of loaded events.
 */
export async function loadEvents(path: string): LoadedFiles<Event> {
    return loadFromCallerPath(path, Event, getCallerPath());
}

/**
 * Loads all modules from the specified folder.
 *
 * @param path The folder to load the modules from.
 * @param callerPath The path the the caller file.
 * @returns An array of loaded modules.
 */
export async function loadModules(path: string): LoadedFiles<Module> {
    return loadFromCallerPath(path, Module, getCallerPath());
}
