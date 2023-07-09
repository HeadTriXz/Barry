import { randomBytes } from "node:crypto";

/**
 * Represents a multipart/form-data object.
 */
export class FormData {
    /**
     * The boundary string used to separate form data fields.
     */
    boundary: string = "----Barry" + randomBytes(16).toString("hex");

    /**
     * An array of buffers that make up the form data.
     */
    #chunks: Buffer[] = [];

    /**
     * The content type of the form data.
     * @readonly
     */
    get contentType(): string {
        return `multipart/form-data; boundary=${this.boundary}`;
    }

    /**
     * The footer of the form data.
     * @readonly
     */
    get footer(): Buffer {
        return Buffer.from(`\r\n--${this.boundary}--`);
    }

    /**
     * Appends a field to the form data.
     *
     * @param name The name of the field.
     * @param value The value of the field.
     * @param filename The filename of the field, if it is a file upload.
     */
    append(name: string, value: any, filename?: string): void {
        let header = `\r\n--${this.boundary}\r\nContent-Disposition: form-data; name="${name}"`;
        if (filename !== undefined) {
            header += `; filename="${filename}"`;
        }

        let contentType = this.#getMimeType(filename);
        if (contentType === undefined) {
            if (ArrayBuffer.isView(value)) {
                contentType = "application/octet-stream";
            } else if (typeof value === "object") {
                contentType = "application/json";
                value = Buffer.from(JSON.stringify(value));
            } else {
                value = Buffer.from(String(value));
            }
        }

        if (contentType !== undefined) {
            header += `\r\nContent-Type: ${contentType}`;
        }

        this.#chunks.push(Buffer.from(header + "\r\n\r\n"));
        this.#chunks.push(value as Buffer);
    }

    /**
     * Returns the complete form data as a buffer.
     *
     * @returns The form data buffer.
     */
    getBuffer(): Buffer {
        return Buffer.concat(this.#chunks.concat(this.footer));
    }

    /**
     * Returns the MIME type for a given file extension.
     *
     * @param filename The filename with extension.
     * @returns The MIME type string, or undefined if the extension is not recognized.
     */
    #getMimeType(filename?: string): string | undefined {
        const extension = filename?.match(/\.(png|apng|gif|jpg|jpeg|webp|svg|json)$/i)?.[1].toLowerCase();
        if (extension) {
            switch (extension) {
                case "png":
                case "apng":
                case "gif":
                case "jpg":
                case "jpeg":
                case "webp": {
                    return `image/${extension}`;
                }
                case "svg": {
                    return "image/svg+xml";
                }
                case "json": {
                    return "application/json";
                }
            }
        }
    }
}
