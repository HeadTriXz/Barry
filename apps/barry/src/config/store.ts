import type { BaseSettings } from "../types/modules.js";
import type { SettingsRepository } from "../types/modules.js";

/**
 * Utility type for making a partial property nullable.
 */
export type Nullable<T> = T extends undefined ? null : T;

/**
 * Represents a store for a guild setting.
 */
export class GuildSettingStore<
    T extends BaseSettings = BaseSettings,
    K extends keyof T = keyof T
> {
    /**
     * The internal cache to use to store the setting.
     */
    #cache: Map<string, Nullable<T[K]>> = new Map();

    /**
     * The key of the setting.
     */
    #key?: K;

    /**
     * The repository to use to store the setting.
     */
    #repository?: SettingsRepository<T>;

    /**
     * Removes the setting from the cache.
     *
     * @param guildID The ID of the guild.
     */
    clear(guildID: string): void {
        this.#cache.delete(guildID);
    }

    /**
     * Retrieves the value of the setting.
     *
     * @param guildID The ID of the guild.
     * @returns The value of the setting.
     */
    async get(guildID: string): Promise<Nullable<T[K]> | null> {
        const cached = this.#cache.get(guildID);
        if (cached !== undefined) {
            return cached;
        }

        if (this.#repository !== undefined && this.#key !== undefined) {
            const settings = await this.#repository.getOrCreate(guildID);

            if (settings !== undefined) {
                const value = settings[this.#key] as Nullable<T[K]>;
                this.#cache.set(guildID, value);
                return value;
            }
        }

        return null;
    }

    /**
     * Retrieves the key of the setting.
     *
     * @returns The key of the setting.
     */
    getKey(): K | undefined {
        return this.#key;
    }

    /**
     * Sets the value of the setting.
     *
     * @param guildID The ID of the guild.
     * @param value The value of the setting.
     */
    async set(guildID: string, value: T[K]): Promise<void> {
        this.#cache.set(guildID, value as Nullable<T[K]>);

        if (this.#repository !== undefined && this.#key !== undefined) {
            await this.#repository.upsert(guildID, {
                [this.#key]: value
            } as unknown as T);
        }
    }

    /**
     * Sets the key of the setting.
     *
     * @param key The key of the setting.
     */
    setKey(key: K): this {
        this.#key = key;
        return this;
    }

    /**
     * Sets the repository of the setting.
     *
     * @param repository The repository of the setting.
     */
    setRepository(repository: SettingsRepository<T>): this {
        this.#repository = repository;
        return this;
    }
}
