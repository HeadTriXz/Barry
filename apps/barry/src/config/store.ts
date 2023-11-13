import type { BaseSettings } from "../types/modules.js";
import type { SettingsRepository } from "../types/modules.js";

/**
 * Utility type for making a partial property nullable.
 */
export type Nullable<T> = {
    [P in keyof T]-?: T[P] | null;
};

/**
 * Represents a store for guild settings.
 */
export class GuildSettingsStore<T extends BaseSettings> {
    /**
     * The internal cache to use to store the settings.
     */
    #cache: Map<string, Nullable<T>> = new Map();

    /**
     * The repository to use to retrieve the settings.
     */
    #repository?: SettingsRepository<T>;

    /**
     * Removes the settings from the cache.
     *
     * @param guildID The ID of the guild.
     */
    clear(guildID: string): void {
        this.#cache.delete(guildID);
    }

    /**
     * Retrieves the settings of the guild.
     *
     * @param guildID The ID of the guild.
     * @returns The settings of the guild.
     */
    async get(guildID: string): Promise<Nullable<T> | null> {
        const cached = this.#cache.get(guildID);
        if (cached !== undefined) {
            return cached;
        }

        if (this.#repository !== undefined) {
            const settings = await this.#repository.getOrCreate(guildID) as Nullable<T>;

            this.#cache.set(guildID, settings);
            return settings;
        }

        return null;
    }

    /**
     * Retrieves the value of a specific setting.
     *
     * @param guildID The ID of the guild.
     * @param key The key of the setting.
     * @returns The value of the setting.
     */
    async getValue<K extends Extract<keyof T, string>>(guildID: string, key: K): Promise<Nullable<T>[K] | null> {
        const settings = await this.get(guildID);
        if (settings !== null) {
            return settings[key];
        }

        return null;
    }

    /**
     * Sets the settings of the guild.
     *
     * @param guildID The ID of the guild.
     * @param settings The settings of the guild.
     */
    async set(guildID: string, settings: Partial<T>): Promise<void> {
        if (this.#repository !== undefined) {
            settings = await this.#repository.upsert(guildID, settings);
        }

        this.#cache.set(guildID, settings as Nullable<T>);
    }

    /**
     * Sets the repository of the settings.
     *
     * @param repository The repository of the settings.
     */
    setRepository(repository: SettingsRepository<T>): this {
        this.#repository = repository;
        return this;
    }

    /**
     * Sets the value of a specific setting.
     *
     * @param guildID The ID of the guild.
     * @param key The key of the setting.
     * @param value The value of the setting.
     */
    async setValue<K extends keyof T>(guildID: string, key: K, value: Nullable<T>[K]): Promise<void> {
        const settings = (await this.#repository?.upsert(guildID, { [key]: value } as unknown as T)
            || this.#cache.get(guildID)
            || {}) as Nullable<T>;

        if (this.#repository === undefined) {
            settings[key] = value as T[K];
        }

        this.#cache.set(guildID, settings);
    }
}
