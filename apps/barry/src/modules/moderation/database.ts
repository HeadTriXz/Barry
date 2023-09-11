import type {
    Case,
    CaseNote,
    CaseType,
    ModerationSettings,
    Prisma,
    PrismaClient,
    TempBan
} from "@prisma/client";

/**
 * Represents a case with its notes.
 */
export interface CaseWithNotes extends Case {
    /**
     * The notes for the case.
     */
    notes: CaseNote[];
}

/**
 * Options for creating a case.
 */
export interface CreateCaseOptions {
    /**
     * The ID of the user who created the case.
     */
    creatorID: string;

    /**
     * The ID of the guild.
     */
    guildID: string;

    /**
     * The note for the case.
     */
    note: string;

    /**
     * The type of the case.
     */
    type: CaseType;

    /**
     * The ID of the user who the case is for.
     */
    userID: string;
}

/**
 * Options for creating a case note.
 */
export interface CreateCaseNoteOptions {
    /**
     * The ID of the case.
     */
    caseID: number;

    /**
     * The content of the note.
     */
    content: string;

    /**
     * The ID of the user who created the note.
     */
    creatorID: string;

    /**
     * The ID of the guild.
     */
    guildID: string;
}

/**
 * Repository class for managing moderation cases.
 */
export class CaseRepository {
    /**
     * The Prisma client used to interact with the database.
     */
    #prisma: PrismaClient;

    /**
     * Repository class for managing moderation cases.
     *
     * @param prisma The Prisma client used to interact with the database.
     */
    constructor(prisma: PrismaClient) {
        this.#prisma = prisma;
    }

    /**
     * Creates a new case.
     *
     * @param options The options for the case.
     * @returns The new case record.
     */
    async create(options: CreateCaseOptions): Promise<Case> {
        const caseID = await this.nextInSequence(options.guildID);
        return this.#prisma.case.create({
            data: {
                creatorID: options.creatorID,
                guildID: options.guildID,
                id: caseID,
                notes: {
                    create: {
                        content: options.note,
                        creatorID: options.creatorID,
                        id: 1
                    }
                },
                type: options.type,
                userID: options.userID
            }
        });
    }

    /**
     * Deletes a case.
     *
     * @param guildID The ID of the guild.
     * @param caseID The ID of the case.
     * @returns The deleted case record.
     */
    async delete(guildID: string, caseID: number): Promise<Case> {
        return this.#prisma.case.delete({
            where: {
                guildID_id: {
                    guildID: guildID,
                    id: caseID
                }
            }
        });
    }

    /**
     * Retrieves a case by its ID with its notes.
     *
     * @param guildID The ID of the guild.
     * @param caseID The ID of the case.
     * @param withNotes Whether to include the notes.
     * @returns The case record with its notes, or null if not found.
     */
    async get(guildID: string, caseID: number, withNotes: true): Promise<CaseWithNotes | null>;

    /**
     * Retrieves a case by its ID.
     *
     * @param guildID The ID of the guild.
     * @param caseID The ID of the case.
     * @param withNotes Whether to include the notes.
     * @returns The case record, or null if not found.
     */
    async get(guildID: string, caseID: number, withNotes?: false): Promise<Case | null>;
    async get(guildID: string, caseID: number, withNotes: boolean = false): Promise<Case | CaseWithNotes | null> {
        return this.#prisma.case.findUnique({
            include: {
                notes: withNotes
                    ? { orderBy: { createdAt: "desc" } }
                    : undefined
            },
            where: {
                guildID_id: {
                    guildID: guildID,
                    id: caseID
                }
            }
        });
    }

    /**
     * Retrieves all cases for the specified guild.
     *
     * @param guildID The ID of the guild.
     * @param type The type of cases to retrieve.
     * @returns The found case records.
     */
    async getAll(guildID: string, type?: CaseType): Promise<Case[]> {
        return this.#prisma.case.findMany({
            orderBy: { createdAt: "desc" },
            where: { guildID, type }
        });
    }

    /**
     * Retrieves all cases for the specified user.
     *
     * @param guildID The ID of the guild.
     * @param userID The ID of the user.
     * @param type The type of cases to retrieve.
     * @returns The found case records.
     */
    async getByUser(guildID: string, userID: string, type?: CaseType): Promise<Case[]> {
        return this.#prisma.case.findMany({
            orderBy: { createdAt: "desc" },
            where: { guildID, type, userID }
        });
    }

    /**
     * Gets the next case ID in the sequence for the specified guild.
     *
     * @param guildID The ID of the guild.
     * @returns The next case ID in the sequence.
     */
    async nextInSequence(guildID: string): Promise<number> {
        return this.#prisma.case
            .aggregate({
                where: { guildID },
                _max: { id: true }
            })
            .then(({ _max }) => _max.id !== null ? _max.id + 1 : 1);
    }

    /**
     * Updates a case.
     *
     * @param guildID The ID of the guild.
     * @param caseID The ID of the case.
     * @param options The options for the case.
     * @returns The updated case record.
     */
    async update(guildID: string, caseID: number, options: Prisma.CaseUpdateInput): Promise<Case> {
        return this.#prisma.case.update({
            data: options,
            where: {
                guildID_id: {
                    guildID: guildID,
                    id: caseID
                }
            }
        });
    }
}

/**
 * Repository class for managing case notes.
 */
export class CaseNoteRepository {
    /**
     * The Prisma client used to interact with the database.
     */
    #prisma: PrismaClient;

    /**
     * Repository class for managing case notes.
     *
     * @param prisma The Prisma client used to interact with the database.
     */
    constructor(prisma: PrismaClient) {
        this.#prisma = prisma;
    }

    /**
     * Creates a new case note.
     *
     * @param guildID The ID of the guild.
     * @param caseID The ID of the case.
     * @param options The options for the case note.
     * @returns The new case note record.
     */
    async create(options: CreateCaseNoteOptions): Promise<CaseNote> {
        const noteID = await this.nextInSequence(options.guildID, options.caseID);
        return this.#prisma.caseNote.create({
            data: {
                caseID: options.caseID,
                content: options.content,
                creatorID: options.creatorID,
                guildID: options.guildID,
                id: noteID
            }
        });
    }

    /**
     * Deletes a case note.
     *
     * @param guildID The ID of the guild.
     * @param caseID The ID of the case.
     * @param noteID The ID of the note.
     * @returns The deleted case note record.
     */
    async delete(guildID: string, caseID: number, noteID: number): Promise<CaseNote> {
        return this.#prisma.caseNote.delete({
            where: {
                guildID_caseID_id: {
                    caseID: caseID,
                    guildID: guildID,
                    id: noteID
                }
            }
        });
    }

    /**
     * Gets the next note ID in the sequence for the specified case.
     *
     * @param guildID The ID of the guild.
     * @param caseID The ID of the case.
     * @returns The next note ID in the sequence.
     */
    async nextInSequence(guildID: string, caseID: number): Promise<number> {
        return this.#prisma.caseNote
            .aggregate({
                where: { guildID, caseID },
                _max: { id: true }
            })
            .then(({ _max }) => _max.id !== null ? _max.id + 1 : 1);
    }

    /**
     * Updates a case note.
     *
     * @param guildID The ID of the guild.
     * @param caseID The ID of the case.
     * @param noteID The ID of the note.
     * @param options The options for the case note.
     * @returns The updated case note record.
     */
    async update(
        guildID: string,
        caseID: number,
        noteID: number,
        options: Prisma.CaseNoteUpdateInput
    ): Promise<CaseNote> {
        return this.#prisma.caseNote.update({
            data: options,
            where: {
                guildID_caseID_id: {
                    caseID: caseID,
                    guildID: guildID,
                    id: noteID
                }
            }
        });
    }
}

/**
 * Repository class for managing settings for the moderation module.
 */
export class ModerationSettingsRepository {
    /**
     * The Prisma client used to interact with the database.
     */
    #prisma: PrismaClient;

    /**
     * Repository class for managing settings for the moderation module.
     *
     * @param prisma The Prisma client used to interact with the database.
     */
    constructor(prisma: PrismaClient) {
        this.#prisma = prisma;
    }

    /**
     * If a record exists for the specified guild, return it, otherwise create a new one.
     *
     * @param guildID The ID of the guild.
     * @returns The moderation settings record.
     */
    async getOrCreate(guildID: string): Promise<ModerationSettings> {
        return this.#prisma.moderationSettings.upsert({
            create: { guildID },
            update: {},
            where: { guildID }
        });
    }

    /**
     * Upserts the moderation settings for the specified guild.
     *
     * @param guildID The ID of the guild.
     * @param settings The moderation settings to update.
     * @returns The updated moderation settings record.
     */
    async upsert(
        guildID: string,
        settings: Partial<Prisma.ModerationSettingsCreateInput>
    ): Promise<ModerationSettings> {
        return this.#prisma.moderationSettings.upsert({
            create: { ...settings, guildID },
            update: settings,
            where: { guildID }
        });
    }
}

/**
 * Repository class for managing temporary bans.
 */
export class TempBanRepository {
    /**
     * The Prisma client used to interact with the database.
     */
    #prisma: PrismaClient;

    /**
     * Repository class for managing temporary bans.
     *
     * @param prisma The Prisma client used to interact with the database.
     */
    constructor(prisma: PrismaClient) {
        this.#prisma = prisma;
    }

    /**
     * Creates a new temporary ban.
     *
     * @param guildID The ID of the guild.
     * @param userID The ID of the user.
     * @param duration The duration of the ban in seconds.
     * @returns The new temporary ban record.
     */
    async create(guildID: string, userID: string, duration: number): Promise<TempBan> {
        const expiresAt = new Date(Date.now() + duration * 1000);
        return this.#prisma.tempBan.create({
            data: {
                expiresAt,
                guildID,
                userID
            }
        });
    }

    /**
     * Deletes a temporary ban.
     *
     * @param guildID The ID of the guild.
     * @param userID The ID of the user.
     * @returns The deleted temporary ban record.
     */
    async delete(guildID: string, userID: string): Promise<TempBan> {
        return this.#prisma.tempBan.delete({
            where: { guildID_userID: { guildID, userID } }
        });
    }

    /**
     * Retrieves a temporary ban for a user.
     *
     * @param guildID The ID of the guild.
     * @param userID The ID of the user.
     * @returns The temporary ban record, or null if not found.
     */
    async get(guildID: string, userID: string): Promise<TempBan | null> {
        return this.#prisma.tempBan.findUnique({
            where: { guildID_userID: { guildID, userID } }
        });
    }

    /**
     * Retrieves all expired temporary bans for the specified guild.
     *
     * @returns The expired temporary ban records.
     */
    async getExpired(): Promise<TempBan[]> {
        return this.#prisma.tempBan.findMany({
            where: { expiresAt: { lte: new Date() } }
        });
    }

    /**
     * Updates a temporary ban.
     *
     * @param guildID The ID of the guild.
     * @param userID The ID of the user.
     * @param duration The new duration of the ban in seconds.
     * @returns The updated temporary ban record.
     */
    async update(guildID: string, userID: string, duration: number): Promise<TempBan> {
        return this.#prisma.tempBan.update({
            data: { expiresAt: new Date(Date.now() + duration * 1000) },
            where: { guildID_userID: { guildID, userID } }
        });
    }
}
