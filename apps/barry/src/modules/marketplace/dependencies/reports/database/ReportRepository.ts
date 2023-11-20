import {
    type PrismaClient,
    type Report,
    type ReportCategory,
    ReportType
} from "@prisma/client";

/**
 * Options for creating a report.
 */
export interface ReportOptions {
    /**
     * The category of the report.
     */
    category: ReportCategory;

    /**
     * The ID of the user who created the report.
     */
    creatorID: string;

    /**
     * The ID of the guild.
     */
    guildID: string;

    /**
     * The reason for the report.
     */
    reason: string;

    /**
     * The ID of the request, if reporting a request.
     */
    requestID?: number;

    /**
     * The type of the report.
     */
    type: ReportType;

    /**
     * The ID of the user being reported.
     */
    userID: string;
}

/**
 * Represents a repository for managing reports.
 */
export class ReportRepository {
    /**
     * The Prisma client used to interact with the database.
     */
    #prisma: PrismaClient;

    /**
     * Represents a repository for managing reports.
     *
     * @param prisma The Prisma client used to interact with the database.
     */
    constructor(prisma: PrismaClient) {
        this.#prisma = prisma;
    }

    /**
     * Creates a new report.
     *
     * @param options The options for the report.
     * @returns The created report.
     */
    async create(options: ReportOptions): Promise<Report> {
        return this.#prisma.report.create({
            data: {
                category: options.category,
                creatorID: options.creatorID,
                guildID: options.guildID,
                profileID: options.type === ReportType.Profile
                    ? options.userID
                    : undefined,
                reason: options.reason,
                requestID: options.requestID,
                type: options.type,
                userID: options.userID
            }
        });
    }

    /**
     * Retrieves a report by its ID.
     *
     * @param id The ID of the report.
     * @returns The report, if found.
     */
    async get(id: number): Promise<Report | null> {
        return this.#prisma.report.findUnique({
            where: { id }
        });
    }
}
