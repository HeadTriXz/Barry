import {
    type LocalReport,
    type Prisma,
    type PrismaClient,
    type Report,
    ReportStatus
} from "@prisma/client";

/**
 * Options for creating a local report.
 */
export interface LocalReportOptions {
    /**
     * The ID of the guild.
     */
    guildID: string;

    /**
     * The ID of the local report.
     */
    id?: number;

    /**
     * The ID of the report.
     */
    reportID: number;

    /**
     * The ID of the thread.
     */
    threadID: string;
}

/**
 * Represents a local report with its report.
 */
export interface LocalReportWithReport extends LocalReport {
    /**
     * The report associated with the local report.
     */
    report: Report;
}

/**
 * Represents a repository for managing local reports.
 */
export class LocalReportRepository {
    /**
     * The Prisma client used to interact with the database.
     */
    #prisma: PrismaClient;

    /**
     * Represents a repository for managing local reports.
     *
     * @param prisma The Prisma client used to interact with the database.
     */
    constructor(prisma: PrismaClient) {
        this.#prisma = prisma;
    }

    /**
     * Creates a new local report.
     *
     * @param options The options for the local report.
     * @returns The created local report.
     */
    async create(options: LocalReportOptions): Promise<LocalReport> {
        const id = options.id ?? await this.nextInSequence(options.guildID);
        return this.#prisma.localReport.create({
            data: {
                id: id,
                guildID: options.guildID,
                reportID: options.reportID,
                threadID: options.threadID
            }
        });
    }

    /**
     * Retrieves all local reports for a user that are accepted.
     *
     * @param guildID The ID of the guild.
     * @param userID The ID of the user.
     * @returns The local reports.
     */
    async getAccepted(guildID: string, userID: string): Promise<LocalReportWithReport[]> {
        return this.#prisma.localReport.findMany({
            include: { report: true },
            where: {
                guildID: guildID,
                report: { userID },
                status: ReportStatus.Accepted
            }
        });
    }

    /**
     * Retrieves a local report by its thread ID.
     *
     * @param creatorID The ID of the creator.
     * @param messageID The ID of the message.
     * @returns The local report, if found.
     */
    async getByCreator(creatorID: string, messageID: string): Promise<LocalReport | null> {
        return this.#prisma.localReport.findFirst({
            where: {
                report: {
                    creatorID: creatorID,
                    OR: [
                        {
                            profile: {
                                messages: {
                                    some: {
                                        messageID
                                    }
                                }
                            }
                        },
                        {
                            request: {
                                messages: {
                                    some: {
                                        messageID
                                    }
                                }
                            }
                        }
                    ]
                },
                status: ReportStatus.Open
            }
        });
    }

    /**
     * Retrieves a local report by its thread ID.
     *
     * @param threadID The ID of the thread.
     * @returns The local report, if found.
     */
    async getByThread(threadID: string): Promise<LocalReport | null>;

    /**
     * Retrieves a local report with its report by its thread ID.
     *
     * @param threadID The ID of the thread.
     * @param withData Whether to include the report data.
     */
    async getByThread(threadID: string, withData: true): Promise<LocalReportWithReport | null>;

    /**
     * Retrieves a local report by its thread ID.
     *
     * @param threadID The ID of the thread.
     * @returns The local report, if found.
     */
    async getByThread(
        threadID: string,
        withData: boolean = false
    ): Promise<LocalReport | LocalReportWithReport | null> {
        return this.#prisma.localReport.findFirst({
            include: { report: withData },
            where: { threadID }
        });
    }

    /**
     * Retrieves the next ID in sequence for a guild.
     *
     * @param guildID The ID of the guild.
     * @returns The next ID in sequence.
     */
    async nextInSequence(guildID: string): Promise<number> {
        return this.#prisma.localReport
            .aggregate({
                where: { guildID },
                _max: { id: true }
            })
            .then(({ _max }) => _max.id !== null ? _max.id + 1 : 1);
    }

    /**
     * Updates a local report.
     *
     * @param guildID The ID of the guild.
     * @param id The ID of the local report.
     * @param options The options for the local report.
     * @returns The updated local report.
     */
    async update(guildID: string, id: number, options: Prisma.LocalReportUpdateInput): Promise<LocalReport> {
        return this.#prisma.localReport.update({
            data: options,
            where: {
                guildID_id: { guildID, id }
            }
        });
    }
}
