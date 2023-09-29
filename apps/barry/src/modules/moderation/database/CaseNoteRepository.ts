import type {
    PrismaClient,
    CaseNote,
    Prisma
} from "@prisma/client";

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
