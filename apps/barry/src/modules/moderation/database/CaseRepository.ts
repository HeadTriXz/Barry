import type {
    Case,
    CaseNote,
    CaseType,
    PrismaClient,
    Prisma
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
