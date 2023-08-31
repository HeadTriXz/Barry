import { Logger, LogSeverity } from "../src/index.js";

import * as Sentry from "@sentry/node";

vi.mock("@sentry/node", () => ({
    captureException: vi.fn(),
    captureMessage: vi.fn(),
    init: vi.fn(),
    withScope: vi.fn()
}));

describe("Logger", () => {
    beforeEach(() => {
        vi.restoreAllMocks();

        console.log = vi.fn();
    });

    describe("debug", () => {
        it("should log a debug message", () => {
            const logger = new Logger({ minSeverity: LogSeverity.TRACE });
            const message = "Hello World";

            logger.debug(message);

            expect(console.log).toHaveBeenCalledOnce();
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining("DEBUG"));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining(message));
        });
    });

    describe("error", () => {
        it("should log an error message", () => {
            const logger = new Logger({ minSeverity: LogSeverity.TRACE });
            const message = "Hello World";

            logger.error(message);

            expect(console.log).toHaveBeenCalledOnce();
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining("ERROR"));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining(message));
        });
    });

    describe("fatal", () => {
        it("should log a fatal message", () => {
            const logger = new Logger({ minSeverity: LogSeverity.TRACE });
            const message = "Hello World";

            logger.fatal(message);

            expect(console.log).toHaveBeenCalledOnce();
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining("FATAL"));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining(message));
        });
    });

    describe("info", () => {
        it("should log an info message", () => {
            const logger = new Logger({ minSeverity: LogSeverity.TRACE });
            const message = "Hello World";

            logger.info(message);

            expect(console.log).toHaveBeenCalledOnce();
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining("INFO"));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining(message));
        });
    });

    describe("trace", () => {
        it("should log a trace message", () => {
            const logger = new Logger({ minSeverity: LogSeverity.TRACE });
            const message = "Hello World";

            logger.trace(message);

            expect(console.log).toHaveBeenCalledOnce();
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining("TRACE"));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining(message));
        });
    });

    describe("warn", () => {
        it("should log a warn message", () => {
            const logger = new Logger({ minSeverity: LogSeverity.TRACE });
            const message = "Hello World";

            logger.warn(message);

            expect(console.log).toHaveBeenCalledOnce();
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining("WARN"));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining(message));
        });
    });

    describe("#log", () => {
        describe("Severity", () => {
            it("should log a message when the severity is equal to minSeverity", () => {
                const logger = new Logger({ minSeverity: LogSeverity.WARN });
                const message = "Hello World";

                logger.warn(message);

                expect(console.log).toHaveBeenCalledOnce();
                expect(console.log).toHaveBeenCalledWith(expect.stringContaining("WARN"));
                expect(console.log).toHaveBeenCalledWith(expect.stringContaining(message));
            });

            it("should log a message when the severity is higher than minSeverity", () => {
                const logger = new Logger({ minSeverity: LogSeverity.INFO });
                const message = "Hello World";

                logger.warn(message);

                expect(console.log).toHaveBeenCalledOnce();
                expect(console.log).toHaveBeenCalledWith(expect.stringContaining("WARN"));
                expect(console.log).toHaveBeenCalledWith(expect.stringContaining(message));
            });

            it("should not log a message when the severity is lower than minSeverity", () => {
                const logger = new Logger({ minSeverity: LogSeverity.ERROR });
                const message = "Hello World";

                logger.warn(message);

                expect(console.log).not.toHaveBeenCalled();
            });

            it("should set minSeverity to 'INFO' in a production environment", () => {
                const logger = new Logger({ environment: "production" });
                const message = "Hello World";

                logger.debug(message);

                expect(console.log).not.toHaveBeenCalled();
            });

            it("should set minSeverity to 'TRACE' in a non-production environment", () => {
                const logger = new Logger({ environment: "development" });
                const message = "Hello World";

                logger.trace(message);

                expect(console.log).toHaveBeenCalled();
            });
        });

        describe("Date", () => {
            function getDate(): string {
                return new Date()
                    .toISOString()
                    .slice(0, -1)
                    .split("T", 1)[0];
            }

            it("should show the date if 'showDate' is true", () => {
                const logger = new Logger({ showDate: true });
                const message = "Hello World";
                const date = getDate();

                logger.info(message);

                expect(console.log).toHaveBeenCalledOnce();
                expect(console.log).toHaveBeenCalledWith(expect.stringContaining(date));
            });

            it("should hide the date if 'showDate' is false", () => {
                const logger = new Logger({ showDate: false });
                const message = "Hello World";
                const date = getDate();

                logger.info(message);

                expect(console.log).toHaveBeenCalledOnce();
                expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining(date));
            });

            it("should show the date by default in a production environment", () => {
                const logger = new Logger({ environment: "production" });
                const message = "Hello World";
                const date = getDate();

                logger.info(message);

                expect(console.log).toHaveBeenCalledOnce();
                expect(console.log).toHaveBeenCalledWith(expect.stringContaining(date));
            });

            it("should hide the date by default in a non-production environment", () => {
                const logger = new Logger({ environment: "development" });
                const message = "Hello World";
                const date = getDate();

                logger.info(message);

                expect(console.log).toHaveBeenCalledOnce();
                expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining(date));
            });
        });

        describe("Formatting", () => {
            function removeFirstLine(str: string): string {
                return str
                    .split("\n")
                    .slice(1)
                    .join("\n");
            }

            it("should format log messages with arguments", () => {
                const logger = new Logger({ minSeverity: LogSeverity.TRACE });

                logger.info("Hello %s", "World");

                expect(console.log).toHaveBeenCalledOnce();
                expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Hello World"));
            });

            it("should format log messages with error objects", () => {
                const logger = new Logger({ minSeverity: LogSeverity.TRACE });

                const message = "An error has occurred:";
                const error = new Error("Hello World");
                const stack = removeFirstLine(error.stack!);

                logger.error(message, error);

                expect(console.log).toHaveBeenCalledOnce();
                expect(console.log).toHaveBeenCalledWith(expect.stringContaining(message));
                expect(console.log).toHaveBeenCalledWith(expect.stringContaining(error.message));
                expect(console.log).toHaveBeenCalledWith(expect.stringContaining(stack));
            });

            it("should ignore the error stack if undefined", () => {
                const logger = new Logger({ minSeverity: LogSeverity.TRACE });

                const message = "An error has occurred:";
                const error = new Error("Hello World");
                const stack = removeFirstLine(error.stack!);

                error.stack = undefined;
                logger.error(message, error);

                expect(console.log).toHaveBeenCalledOnce();
                expect(console.log).toHaveBeenCalledWith(expect.stringContaining(message));
                expect(console.log).toHaveBeenCalledWith(expect.stringContaining(error.message));
                expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining(stack));
            });
        });

        describe("Sentry", () => {
            it("should initialize Sentry if a valid DSN is provided", () => {
                new Logger({
                    environment: "development",
                    sentry: {
                        dsn: "sentry-dsn"
                    }
                });

                expect(Sentry.init).toHaveBeenCalledOnce();
                expect(Sentry.init).toHaveBeenCalledWith({
                    dsn: "sentry-dsn",
                    environment: "development",
                    serverName: "barry"
                });
            });

            it("should not initialize Sentry if no DSN is provided", () => {
                new Logger({
                    environment: "development",
                    sentry: {
                        minSeverity: LogSeverity.ERROR
                    }
                });

                expect(Sentry.init).not.toHaveBeenCalled();
            });

            it("should capture an exception in Sentry if the severity is equal to 'ERROR'", () => {
                const logger = new Logger({
                    environment: "development",
                    sentry: {
                        dsn: "sentry-dsn"
                    }
                });

                const message = "An error has occurred:";
                const error = new Error("Hello World");

                logger.error(message, error);

                expect(Sentry.captureMessage).not.toHaveBeenCalled();
                expect(Sentry.captureException).toHaveBeenCalledOnce();
                expect(Sentry.captureException).toHaveBeenCalledWith(error, { level: "error" });
            });

            it("should capture an exception in Sentry if the severity is higher than 'ERROR'", () => {
                const logger = new Logger({
                    environment: "development",
                    sentry: {
                        dsn: "sentry-dsn"
                    }
                });

                const error = new Error("Hello World");

                logger.fatal(error);

                expect(Sentry.captureMessage).not.toHaveBeenCalled();
                expect(Sentry.captureException).toHaveBeenCalledOnce();
                expect(Sentry.captureException).toHaveBeenCalledWith(error, { level: "fatal" });
            });

            it("should capture a message in Sentry if the severity is lower than 'ERROR'", () => {
                const logger = new Logger({
                    environment: "development",
                    sentry: {
                        dsn: "sentry-dsn"
                    }
                });

                const message = "Oh no! Anyway...";

                logger.warn(message);

                expect(Sentry.captureException).not.toHaveBeenCalled();
                expect(Sentry.captureMessage).toHaveBeenCalledOnce();
                expect(Sentry.captureMessage).toHaveBeenCalledWith(expect.stringContaining(message), { level: "warning" });
            });

            it("should use the message if the severity is higher than 'ERROR' and no error is provided", () => {
                const logger = new Logger({
                    environment: "development",
                    sentry: {
                        dsn: "sentry-dsn"
                    }
                });

                logger.error("Hello %s", "World");

                expect(Sentry.captureException).toHaveBeenCalledOnce();
                expect(Sentry.captureException).toHaveBeenCalledWith("Hello World", { level: "error" });
            });
        });
    });
});
