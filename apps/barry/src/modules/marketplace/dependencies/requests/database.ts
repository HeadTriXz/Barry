import {
    type Prisma,
    type PrismaClient,
    type Request,
    type RequestAttachment,
    type RequestMessage,
    type RequestsSettings,
    RequestStatus
} from "@prisma/client";

/**
 * Represents a request with attachments.
 */
export interface RequestWithAttachments extends Request {
    /**
     * The attachments for the request.
     */
    attachments: RequestAttachment[];
}

/**
 * Represents a request with messages.
 */
export interface RequestWithMessages extends Request {
    /**
     * The messages for the request.
     */
    messages: RequestMessage[];
}

/**
 * Repository class for managing requests.
 */
export class RequestRepository {
    /**
     * The Prisma client used to interact with the database.
     */
    #prisma: PrismaClient;

    /**
     * Repository class for managing requests.
     *
     * @param prisma The Prisma client used to interact with the database.
     */
    constructor(prisma: PrismaClient) {
        this.#prisma = prisma;
    }

    /**
     * Deletes a request record.
     *
     * @param id The ID of the request.
     * @returns The deleted request record.
     */
    async delete(id: number): Promise<Request> {
        return this.#prisma.request.delete({ where: { id } });
    }

    /**
     * Retrieves the available request records for the specified user.
     *
     * @param userID The ID of the user.
     * @returns The available request records.
     */
    async getAvailableByUser(userID: string): Promise<RequestWithAttachments[]> {
        return this.#prisma.request.findMany({
            include: { attachments: true },
            orderBy: { updatedAt: "desc" },
            where: {
                status: RequestStatus.Available,
                userID: userID
            }
        });
    }

    /**
     * Retrieves the request record for the specified message.
     *
     * @param messageID The ID of the message.
     * @returns The request record, or null if not found.
     */
    async getByMessage(messageID: string): Promise<Request | null> {
        return this.#prisma.request.findFirst({
            where: {
                messages: {
                    some: { messageID }
                }
            }
        });
    }

    /**
     * Retrieves the draft request for the specified user.
     *
     * @param userID The ID of the user.
     * @returns The draft request, or null if not found.
     */
    async getDraft(userID: string): Promise<RequestWithAttachments | null> {
        return this.#prisma.request.findFirst({
            include: { attachments: true },
            where: {
                status: {
                    in: [
                        RequestStatus.DraftContact,
                        RequestStatus.DraftAttachments,
                        RequestStatus.DraftPreview
                    ]
                },
                userID: userID
            }
        });
    }

    /**
     * Retrieves the editable request records for the specified user.
     *
     * @param userID The ID of the user.
     * @returns The editable request records.
     */
    async getEditableByUser(userID: string): Promise<RequestWithAttachments[]> {
        return this.#prisma.request.findMany({
            include: { attachments: true },
            orderBy: { updatedAt: "desc" },
            where: {
                status: {
                    in: [
                        RequestStatus.Available,
                        RequestStatus.Taken
                    ]
                },
                userID: userID
            }
        });
    }

    /**
     * Retrieves the requests that can be flagged for the specified user.
     *
     * @param guildID The ID of the guild.
     * @param userID The ID of the user.
     * @param maxDays The amount of days to get requests for.
     * @returns The flaggable request records.
     */
    async getFlaggableByUser(
        guildID: string,
        userID: string,
        maxDays: number = 14
    ): Promise<Array<RequestWithAttachments & RequestWithMessages>> {
        const milliseconds = maxDays * 86400000;
        const timestamp = BigInt(Date.now() - milliseconds - 1420070400000);
        const minimumID = String(timestamp << 22n);

        return this.#prisma.request.findMany({
            include: {
                attachments: true,
                messages: {
                    where: {
                        guildID: guildID,
                        messageID: {
                            gte: minimumID
                        }
                    }
                }
            },
            where: {
                messages: {
                    some: {
                        guildID: guildID,
                        messageID: {
                            gte: minimumID
                        }
                    }
                },
                userID: userID
            }
        });
    }

    /**
     * Upserts a request record for the specified user.
     *
     * @param userID The ID of the user or request.
     * @param options The options for creating a new request.
     * @param requestID The ID of the request.
     * @returns The created or updated request record.
     */
    async upsert(
        userID: string,
        options: Partial<Prisma.RequestCreateInput>,
        requestID?: number
    ): Promise<RequestWithAttachments> {
        if (requestID === undefined) {
            const draft = await this.getDraft(userID);
            if (draft !== null) {
                requestID = draft.id;
            }
        }

        if (requestID !== undefined) {
            const data: Prisma.RequestUpdateInput = { ...options };
            if (data.attachments !== undefined) {
                data.attachments = {
                    deleteMany: {},
                    create: data.attachments.create
                };
            }

            return this.#prisma.request.update({
                data: data,
                include: { attachments: true },
                where: { id: requestID }
            });
        }

        if (!this.#hasRequiredFields(options)) {
            throw new Error("Missing required fields.");
        }

        return this.#prisma.request.create({
            data: { ...options, userID },
            include: { attachments: true }
        });
    }

    /**
     * Checks if the specified options contain the required fields.
     *
     * @param options The options for creating a new request.
     * @returns Whether the options contain the required fields.
     */
    #hasRequiredFields(options: Partial<Prisma.RequestCreateInput>): options is Prisma.RequestCreateInput {
        return options.compensation !== undefined
            && options.description !== undefined
            && options.title !== undefined;
    }
}

/**
 * Repository class for managing request messages.
 */
export class RequestMessageRepository {
    /**
     * The Prisma client used to interact with the database.
     */
    #prisma: PrismaClient;

    /**
     * Repository class for managing request messages.
     */
    constructor(prisma: PrismaClient) {
        this.#prisma = prisma;
    }

    /**
     * Creates a new request message record.
     *
     * @param messageID The ID of the message.
     * @param guildID The ID of the guild.
     * @param requestID The ID of the request.
     * @returns The created request message record.
     */
    async create(messageID: string, guildID: string, requestID: number): Promise<RequestMessage> {
        return this.#prisma.requestMessage.create({
            data: {
                guildID,
                messageID,
                requestID
            }
        });
    }

    /**
     * Retrieves the latest request message record for the specified request.
     *
     * @param guildID The ID of the guild.
     * @param requestID The ID of the request.
     * @returns The latest request message record, or null if not found.
     */
    async getLatest(guildID: string, requestID: number): Promise<RequestMessage | null> {
        return this.#prisma.requestMessage.findFirst({
            orderBy: { messageID: "desc" },
            where: { guildID, requestID }
        });
    }
}

/**
 * Repository class for managing settings for the requests module.
 */
export class RequestsSettingsRepository {
    /**
     * The Prisma client used to interact with the database.
     */
    #prisma: PrismaClient;

    /**
     * Repository class for managing settings for the requests module.
     */
    constructor(prisma: PrismaClient) {
        this.#prisma = prisma;
    }

    /**
     * If a record exists for the specified guild, return it, otherwise create a new one.
     *
     * @param guildID The ID of the guild.
     * @returns The requests settings record.
     */
    async getOrCreate(guildID: string): Promise<RequestsSettings> {
        return this.#prisma.requestsSettings.upsert({
            create: { guildID },
            update: {},
            where: { guildID }
        });
    }

    /**
     * Upserts the specified settings for the specified guild.
     *
     * @param guildID The ID of the guild.
     * @param settings The request settings to upsert.
     * @returns The upserted request settings record.
     */
    async upsert(guildID: string, settings: Partial<Prisma.RequestsSettingsCreateInput>): Promise<void> {
        await this.#prisma.requestsSettings.upsert({
            create: { ...settings, guildID },
            update: settings,
            where: { guildID }
        });
    }
}
