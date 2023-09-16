import { type HeadersInit, fetch } from "undici";
import { type Server, FastifyServer, StatusCodes } from "../src/index.js";

import { File } from "node:buffer";
import nacl from "tweetnacl";
import type { ServerRequestHandler } from "../src/Server.js";
import type { MockedFunction } from "vitest";

const SERVER_HOST = "localhost";
const SERVER_PORT = 3000;
const SERVER_URL = `http://${SERVER_HOST}:${SERVER_PORT}/`;

/**
 * Get the signature headers for a request.
 *
 * @param privateKey The private key used for signing.
 * @param payload The payload to be signed.
 * @returns The signature headers.
 */
function getSignatureHeaders(privateKey: string, payload?: any): HeadersInit {
    if (typeof payload !== "string") {
        payload = JSON.stringify(payload);
    }

    const timestamp = Date.now().toString();
    const signature = nacl.sign.detached(
        Buffer.from(`${timestamp}${payload}`, "utf8"),
        Buffer.from(privateKey, "hex")
    );

    return {
        "x-signature-ed25519": Buffer.from(signature).toString("hex"),
        "x-signature-timestamp": timestamp
    };
}

describe("FastifyServer", () => {
    let server: Server;
    let secretKey: string;
    let callback: MockedFunction<ServerRequestHandler>;

    beforeAll(async () => {
        const pair = nacl.sign.keyPair();
        const publicKey = Buffer.from(pair.publicKey).toString("hex");

        callback = vi.fn();
        secretKey = Buffer.from(pair.secretKey).toString("hex");
        server = new FastifyServer({ publicKey });
        server.post("/", callback);

        await server.listen(SERVER_PORT, SERVER_HOST);
    });

    afterAll(async () => {
        await server.close();
    });

    describe("Receive request", () => {
        it("should accept requests with a valid key", async () => {
            callback.mockImplementation((body, respond) => {
                return respond({ status: StatusCodes.OK });
            });

            const response = await fetch(SERVER_URL, {
                method: "POST",
                headers: getSignatureHeaders(secretKey)
            });

            expect(response.status).toBe(StatusCodes.OK);
        });

        it("should reject requests with an invalid key", async () => {
            callback.mockImplementation((body, respond) => {
                return respond({ status: StatusCodes.OK });
            });

            const response = await fetch(SERVER_URL, {
                method: "POST",
                headers: {
                    "x-signature-ed25519": "INVALID-SIGNATURE",
                    "x-signature-timestamp": Date.now().toString()
                }
            });

            expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
        });

        it("should reject requests without a key", async () => {
            callback.mockImplementation((body, respond) => {
                return respond({ status: StatusCodes.OK });
            });

            const response = await fetch(SERVER_URL, {
                method: "POST"
            });

            expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
        });

        it("should receive the right request body", async () => {
            callback.mockImplementation((body, respond) => {
                return respond({ body });
            });

            const body = { message: "Hello World" };
            const response = await fetch(SERVER_URL, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    ...getSignatureHeaders(secretKey, body)
                },
                body: JSON.stringify(body)
            });

            expect(response.status).toBe(StatusCodes.OK);

            const json = await response.json();
            expect(json).toEqual(body);
        });
    });

    describe("Send response", () => {
        it("should respond with the specified file", async () => {
            const fileContent = "Hello World";
            const fileName = "file.txt";

            callback.mockImplementation((body, respond) => {
                return respond({
                    files: [{
                        name: fileName,
                        data: Buffer.from(fileContent)
                    }]
                });
            });

            const response = await fetch(SERVER_URL, {
                method: "POST",
                headers: getSignatureHeaders(secretKey)
            });

            expect(response.status).toEqual(StatusCodes.OK);

            const formData = await response.formData();
            const file = formData.get("files[0]") as File;

            expect(file).toBeInstanceOf(File);
            expect(file.name).toBe(fileName);

            const text = await file.text();
            expect(text).toBe(fileContent);
        });

        it("should respond with the specified file", async () => {
            const fileContent = "Hello World";
            const fileName = "file.txt";

            callback.mockImplementation((body, respond) => {
                return respond({
                    files: [{
                        name: fileName,
                        data: Buffer.from(fileContent)
                    }]
                });
            });

            const response = await fetch(SERVER_URL, {
                method: "POST",
                headers: getSignatureHeaders(secretKey)
            });

            expect(response.status).toEqual(StatusCodes.OK);

            const formData = await response.formData();
            const file = formData.get("files[0]") as File;

            expect(file).toBeInstanceOf(File);
            expect(file.name).toBe(fileName);

            const text = await file.text();
            expect(text).toBe(fileContent);
        });

        it("should respond with the specified file and body", async () => {
            const fileContent = "Hello World";
            const fileName = "file.txt";

            const payload = { message: "Hello World" };

            callback.mockImplementation((body, respond) => {
                return respond({
                    body: payload,
                    files: [{
                        name: fileName,
                        data: Buffer.from(fileContent)
                    }]
                });
            });

            const response = await fetch(SERVER_URL, {
                method: "POST",
                headers: getSignatureHeaders(secretKey)
            });

            expect(response.status).toEqual(StatusCodes.OK);

            const formData = await response.formData();
            const body = formData.get("payload_json") as string;

            expect(body).not.toBeNull();
            expect(JSON.parse(body)).toEqual(payload);
        });

        it("should respond with the specified headers", async () => {
            callback.mockImplementation((body, respond) => {
                return respond({
                    headers: {
                        "x-custom-header": "Hello World"
                    }
                });
            });

            const response = await fetch(SERVER_URL, {
                method: "POST",
                headers: getSignatureHeaders(secretKey)
            });

            expect(response.status).toEqual(StatusCodes.OK);
            expect(response.headers.get("x-custom-header")).toEqual("Hello World");
        });
    });
});
