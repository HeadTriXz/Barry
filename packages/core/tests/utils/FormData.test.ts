import { beforeEach, describe, expect, it } from "vitest";
import { FormData } from "../../src/index.js";

describe("FormData", () => {
    let formData: FormData;

    beforeEach(() => {
        formData = new FormData();
    });

    describe("contentType", () => {
        it("should return the correct 'Content-Type' header", () => {
            expect(formData.contentType).toMatch(/^multipart\/form-data; boundary=----Barry[a-f0-9]{32}$/);
        });
    });

    describe("footer", () => {
        it("should return the footer buffer", () => {
            const footer = formData.footer;

            expect(footer).toBeInstanceOf(Buffer);
            expect(footer.toString()).toBe(`\r\n--${formData.boundary}--`);
        });
    });

    describe("append", () => {
        it("should append a field to the form data", () => {
            const name = "testField";
            const value = "testValue";
            formData.append(name, value);

            const buffer = formData.getBuffer();
            expect(buffer).toBeInstanceOf(Buffer);
            expect(buffer.toString()).toContain(`\r\n--${formData.boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}`);
        });

        it("should append a file to the form data with the correct content type", () => {
            const name = "file";
            const value = Buffer.from([0x12, 0x34, 0x56]);
            const filename = "test.png";

            formData.append(name, value, filename);

            const buffer = formData.getBuffer();
            expect(buffer).toBeInstanceOf(Buffer);
            expect(buffer.toString()).toContain(`\r\n--${formData.boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${filename}"\r\nContent-Type: image/png\r\n\r\n${value}`);
        });

        it("should append a JSON object to the form data with the correct content type", () => {
            const name = "file";
            const value = { foo: "bar" };

            formData.append(name, value);

            const buffer = formData.getBuffer();
            expect(buffer).toBeInstanceOf(Buffer);
            expect(buffer.toString()).toContain(`\r\n--${formData.boundary}\r\nContent-Disposition: form-data; name="${name}"\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(value)}`);
        });

        it("should append an ArrayBuffer to the form data with the correct content type", () => {
            const name = "file";
            const value = new Uint8Array([0x12, 0x34, 0x56]);

            formData.append(name, value);

            const buffer = formData.getBuffer();
            expect(buffer).toBeInstanceOf(Buffer);
            expect(buffer.toString()).toContain(`\r\n--${formData.boundary}\r\nContent-Disposition: form-data; name="${name}"\r\nContent-Type: application/octet-stream\r\n\r\n`);
        });
    });

    describe("getBuffer", () => {
        it("should return the complete form data as a buffer", () => {
            const name = "testField";
            const value = "testValue";
            formData.append(name, value);

            const buffer = formData.getBuffer();

            expect(buffer).toBeInstanceOf(Buffer);
            expect(buffer.toString()).toContain(`\r\n--${formData.boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}`);
            expect(buffer.toString()).toContain(formData.footer);
        });
    });

    describe("#getMimeType", () => {
        it("should return the correct MIME type for known extensions", () => {
            const extensions = [
                { extension: "png", mimeType: "image/png" },
                { extension: "apng", mimeType: "image/apng" },
                { extension: "gif", mimeType: "image/gif" },
                { extension: "jpg", mimeType: "image/jpg" },
                { extension: "jpeg", mimeType: "image/jpeg" },
                { extension: "webp", mimeType: "image/webp" },
                { extension: "svg", mimeType: "image/svg+xml" },
                { extension: "json", mimeType: "application/json" }
            ];

            for (const { extension, mimeType } of extensions) {
                const value = Buffer.from([0x12, 0x34, 0x56]);
                formData.append(extension, value, `test.${extension}`);

                const buffer = formData.getBuffer();
                expect(buffer.toString()).toContain(`\r\n--${formData.boundary}\r\nContent-Disposition: form-data; name="${extension}"; filename="test.${extension}"\r\nContent-Type: ${mimeType}\r\n\r\n`);
            }
        });
    });
});
