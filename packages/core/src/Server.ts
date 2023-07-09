import type { FastifyInstance } from "fastify";
import fastify from "fastify";
import nacl from "tweetnacl";
import { FormData } from "./utils/FormData.js";

/**
 * HTTP response status codes.
 */
export enum StatusCodes {
    /**
     * The response for successful HTTP requests.
     */
    OK = 200,

    /**
     * The server cannot or will not process the request due to an apparent client error.
     */
    BAD_REQUEST = 400,

    /**
     * Similar to 403 Forbidden, but specifically for use when authentication is required and has failed or has not yet
     * been provided.
     */
    UNAUTHORIZED = 401,

    /**
     * A request method is not supported for the requested resource.
     */
    METHOD_NOT_ALLOWED = 405,

    /**
     * A generic error message, given when an unexpected condition was encountered.
     */
    INTERNAL_SERVER_ERROR = 500
}

/**
 * The data of a file.
 */
export type FileContentData = Buffer | string | number | boolean;

/**
 * A function that handles responses from the server.
 */
export type ResponseHandler<T = any> = (options: ResponseOptions<T>) => Promise<void>;

/**
 * A function that handles incoming requests to the server.
 */
export type ServerRequestHandler<T = unknown> = (body: T, respond: ResponseHandler) => Promise<void>;

/**
 * Represents a file.
 */
export interface FileContent {
    /**
     * The data of the file.
     */
    data: FileContentData;

    /**
     * An optional key for the file. Will default to the index.
     */
    key?: string;

    /**
     * The name of the file.
     */
    name: string;
}

/**
 * Represents the options for an HTTP response.
 */
export interface ResponseOptions<T = Record<string, any>> {
    /**
     * The response body.
     */
    body?: T;

    /**
     * An array of files to be sent in the response.
     */
    files?: FileContent[];

    /**
     * The headers to be sent in the response.
     */
    headers?: Record<string, string>;

    /**
     * The HTTP status code to be sent in the response.
     */
    status?: StatusCodes;
}

/**
 * Represents a server that can listen for incoming requests.
 */
export interface Server {
    /**
     * Closes the connection of the server.
     */
    close(): Promise<void>;

    /**
     * Starts listening on the specified host and port.
     *
     * @param port The port number to listen on.
     * @param host The hostname or IP address to listen on.
     */
    listen(port: number, host: string): Promise<void>;

    /**
     * Registers a handler for incoming POST requests to the specified path.
     *
     * @param path The path to handle.
     * @param callback The handler for incoming requests to the specified path.
     * @returns The server instance, for chaining.
     */
    post(path: string, callback: ServerRequestHandler): this;
}

/**
 * Options for a {@link Server}.
 */
export interface ServerOptions {
    /**
     * The public key to use for verifying incoming requests.
     */
    publicKey: string;
}

/**
 * Verifies the signature of an incoming request.
 *
 * @param body The request body as a string.
 * @param signature The signature to verify.
 * @param timestamp The timestamp of the request.
 * @param publicKey The public key to use for verification.
 * @returns Whether the signature is valid.
 */
function verifyKey(body: string, signature: string, timestamp: string, publicKey: string): boolean {
    try {
        return nacl.sign.detached.verify(
            Buffer.from(timestamp + body),
            Buffer.from(signature, "hex"),
            Buffer.from(publicKey, "hex")
        );
    } catch {
        return false;
    }
}

/**
 * A server implementation that uses the Fastify framework.
 */
export class FastifyServer implements Server {
    /**
     * The public key to use for verifying incoming requests.
     */
    #publicKey: string;

    /**
     * The Fastify server instance.
     */
    #server: FastifyInstance;

    /**
     * A server implementation that uses the Fastify framework.
     *
     * @param options Options for the Fastify server.
     */
    constructor(options: ServerOptions) {
        this.#server = fastify();
        this.#publicKey = options.publicKey;

        this.#server.addHook("preHandler", (request, response, done) => {
            if (request.method !== "POST") {
                return done();
            }

            const signature = request.headers["x-signature-ed25519"] as string;
            const timestamp = request.headers["x-signature-timestamp"] as string;

            if (signature === undefined || timestamp === undefined) {
                return response.status(StatusCodes.UNAUTHORIZED).send({ error: "Invalid signature" });
            }

            if (!verifyKey(JSON.stringify(request.body), signature, timestamp, this.#publicKey)) {
                return response.status(StatusCodes.UNAUTHORIZED).send({ error: "Invalid signature" });
            }

            done();
        });
    }

    /**
     * Closes the connection of the server.
     */
    async close(): Promise<void> {
        await this.#server.close();
    }

    /**
     * Starts listening on the specified host and port.
     *
     * @param port The port number to listen on.
     * @param host The hostname or IP address to listen on.
     */
    async listen(port: number, host: string): Promise<void> {
        await this.#server.listen({ port, host });
    }

    /**
     * Registers a handler for incoming POST requests to the specified path.
     *
     * @param path The path to handle.
     * @param callback The handler for incoming requests to the specified path.
     * @returns The server instance, for chaining.
     */
    post(path: string, callback: ServerRequestHandler<unknown>): this {
        this.#server.post(path, (request, response) => {
            callback(request.body, async (options) => {
                response.status(options.status ?? StatusCodes.OK);
                if (options.headers !== undefined) {
                    response.headers(options.headers);
                }

                if (options.files !== undefined) {
                    const form = new FormData();
                    for (const [i, file] of Object.entries(options.files)) {
                        form.append(file.key ?? `files[${i}]`, file.data, file.name);
                    }

                    if (options.body !== undefined) {
                        form.append("payload_json", options.body);
                    }

                    return response
                        .type(form.contentType)
                        .send(form.getBuffer());
                }

                return response.send(options.body);
            });
        });

        return this;
    }
}
