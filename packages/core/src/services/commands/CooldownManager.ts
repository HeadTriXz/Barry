/**
 * Represents a cooldown manager that tracks cooldowns.
 */
export interface CooldownManager {
    /**
     * Get the expiration date of a cooldown for the specified key.
     *
     * @param key The key associated with the cooldown.
     * @returns The expiration date of the cooldown, if found.
     */
    get(key: string): number | undefined;

    /**
     * Check if a cooldown with the specified key exists and is still active.
     *
     * @param key The key associated with the cooldown.
     * @returns Whether the cooldown exists and is active.
     */
    has(key: string): boolean;

    /**
     * Remove a cooldown with the specified key.
     *
     * @param key The key associated with the cooldown.
     * @returns Whether the cooldown was successfully removed.
     */
    remove(key: string): boolean;

    /**
     * Set a new cooldown for the specified key.
     *
     * @param key The key associated with the cooldown.
     * @param duration The duration of the cooldown in milliseconds.
     */
    set(key: string, duration: number): void;
}

/**
 * Represents a map-based cooldown manager that tracks cooldowns.
 */
export class MapCooldownManager implements CooldownManager {
    /**
     * A map to store the cooldowns in.
     */
    #cooldowns: Map<string, number> = new Map();

    /**
     * Get the expiration date of a cooldown for the specified key.
     *
     * @param key The key associated with the cooldown.
     * @returns The expiration date of the cooldown, if found.
     */
    get(key: string): number | undefined {
        const expiresAt = this.#cooldowns.get(key);
        if (expiresAt !== undefined && expiresAt <= Date.now()) {
            this.remove(key);
            return;
        }

        return expiresAt;
    }

    /**
     * Check if a cooldown with the specified key exists and is still active.
     *
     * @param key The key associated with the cooldown.
     * @returns Whether the cooldown exists and is active.
     */
    has(key: string): boolean {
        const expiresAt = this.get(key);
        if (expiresAt === undefined) {
            return false;
        }

        return true;
    }

    /**
     * Remove a cooldown with the specified key.
     *
     * @param key The key associated with the cooldown.
     * @returns Whether the cooldown was successfully removed.
     */
    remove(key: string): boolean {
        return this.#cooldowns.delete(key);
    }

    /**
     * Set a new cooldown for the specified key.
     *
     * @param key The key associated with the cooldown.
     * @param duration The duration of the cooldown in milliseconds.
     */
    set(key: string, duration: number): void {
        this.#cooldowns.set(key, Date.now() + duration);
    }
}
