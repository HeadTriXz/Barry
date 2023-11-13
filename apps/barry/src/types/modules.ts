/**
 * Represents the base settings for a module.
 */
export interface BaseSettings {
    /**
     * The ID of the guild these settings belong to.
     */
    guildID: string;
}

/**
 * Represents a repository for the settings of a module.
 */
export interface SettingsRepository<T extends BaseSettings> {
    /**
     * If a record exists for the specified guild, return it, otherwise create a new one.
     *
     * @param guildID The ID of the guild.
     * @returns The settings record.
     */
    getOrCreate(guildID: string): Promise<T>;

    /**
     * Upserts the settings for the specified guild.
     *
     * @param guildID The ID of the guild.
     * @param settings The settings to update.
     * @returns The updated settings record.
     */
    upsert(guildID: string, settings: Partial<Omit<T, "guildID">>): Promise<T>;
}

/**
 * Represents a module with settings.
 */
export interface ModuleWithSettings<T extends BaseSettings = BaseSettings> {
    /**
     * The settings repository for the module.
     */
    settings: SettingsRepository<T>;
}
