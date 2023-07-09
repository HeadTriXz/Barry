import {
    type BaseLogger,
    type LoggerOptions,
    LogSeverity
} from "./types.js";

import * as Sentry from "@sentry/node";
import util from "node:util";

/**
 * Represents a type that recursively makes all properties of an object partial.
 * If a property is an object, it will also be made partial recursively.
 *
 * @template T The type to make partial.
 */
type NestedPartial<T> = {
    [P in keyof T]?: T[P] extends object ? NestedPartial<T[P]> : T[P];
};

/**
 * Represents the colors used for different log severity levels.
 */
const LogSeverityColor = {
    [LogSeverity.DEBUG]: "\x1b[32mDEBUG\x1b[0m",
    [LogSeverity.ERROR]: "\x1b[31mERROR\x1b[0m",
    [LogSeverity.FATAL]: "\x1b[31mFATAL\x1b[0m",
    [LogSeverity.INFO]: "\x1b[34mINFO\x1b[0m",
    [LogSeverity.TRACE]: "\x1b[90mTRACE\x1b[0m",
    [LogSeverity.WARN]: "\x1b[33mWARN\x1b[0m"
} satisfies Record<LogSeverity, string>;

/**
 * Represents the Sentry severity levels corresponding to log severity levels.
 */
const SentryLevel = {
    [LogSeverity.DEBUG]: "debug",
    [LogSeverity.ERROR]: "error",
    [LogSeverity.FATAL]: "fatal",
    [LogSeverity.INFO]: "info",
    [LogSeverity.TRACE]: "log",
    [LogSeverity.WARN]: "warning"
} satisfies Record<LogSeverity, Sentry.SeverityLevel>;

/**
 * Represents a logger with Sentry integration.
 */
export class Logger implements BaseLogger {
    /**
     * The options of the logger.
     */
    #options: LoggerOptions;

    /**
     * Represents a logger.
     *
     * @param options Options for the logger.
     */
    constructor(options: NestedPartial<LoggerOptions> = {}) {
        const environment = options.environment ?? "production";

        this.#options = {
            environment: environment,
            minSeverity: options.minSeverity
                ?? (environment === "production"
                    ? LogSeverity.INFO
                    : LogSeverity.TRACE),
            sentry: {
                dsn: options.sentry?.dsn,
                minSeverity: options.sentry?.minSeverity
                    ?? options.minSeverity
                    ?? LogSeverity.WARN
            },
            showDate: options.showDate
                ?? environment === "production"
        };

        if (this.#options.sentry?.dsn !== undefined) {
            Sentry.init({
                dsn: this.#options.sentry.dsn,
                environment: environment,
                serverName: this.#options.sentry.serverName ?? "barry"
            });
        }
    }

    /**
     * Logs a debug message.
     *
     * @param message The debug message.
     * @param args Additional arguments to be interpolated into the log message.
     */
    debug(message: unknown, ...args: unknown[]): void {
        this.#log(LogSeverity.DEBUG, message, ...args);
    }

    /**
     * Logs an error message.
     *
     * @param message The error message.
     * @param args Additional arguments to be interpolated into the log message.
     */
    error(message: unknown, ...args: unknown[]): void {
        this.#log(LogSeverity.ERROR, message, ...args);
    }

    /**
     * Logs a fatal message.
     *
     * @param message The fatal message.
     * @param args Additional arguments to be interpolated into the log message.
     */
    fatal(message: unknown, ...args: unknown[]): void {
        this.#log(LogSeverity.FATAL, message, ...args);
    }

    /**
     * Logs an info message.
     *
     * @param message The info message.
     * @param args Additional arguments to be interpolated into the log message.
     */
    info(message: unknown, ...args: unknown[]): void {
        this.#log(LogSeverity.INFO, message, ...args);
    }

    /**
     * Logs a trace message.
     *
     * @param message The trace message.
     * @param args Additional arguments to be interpolated into the log message.
     */
    trace(message: unknown, ...args: unknown[]): void {
        this.#log(LogSeverity.TRACE, message, ...args);
    }

    /**
     * Logs a warning message.
     *
     * @param message The warning message.
     * @param args Additional arguments to be interpolated into the log message.
     */
    warn(message: unknown, ...args: unknown[]): void {
        this.#log(LogSeverity.WARN, message, ...args);
    }

    /**
     * Formats an error for the console.
     *
     * @param error The error to format.
     * @returns The formatted error.
     */
    #formatError(error: Error): string {
        const name = `\x1b[41m ${error.constructor.name} \x1b[0m`;
        const result = `\n${name} ${error.message}\n`;
        if (error.stack !== undefined) {
            const stack = error.stack
                .split("\n")
                .slice(1)
                .join("\n");

            return `${result}${stack}\n`;
        }

        return result;
    }

    /**
     * Formats a message using `printf`-style string formatting.
     *
     * @param message The message to format.
     * @param args Additional arguments to be interpolated into the log message.
     * @returns The formatted message.
     */
    #formatMessage(message: unknown, ...args: unknown[]): string {
        if (message instanceof Error) {
            message = this.#formatError(message);
        }

        for (let i = 0; i < args.length; i++) {
            if (args[i] instanceof Error) {
                args[i] = this.#formatError(args[i] as Error);
            }
        }

        return util.formatWithOptions({
            colors: true,
            compact: false
        }, message, ...args);
    }

    /**
     * Returns the current date and time as a formatted string.
     *
     * @returns The current date and time.
     */
    #getDatetime(): string {
        const [date, time] = new Date()
            .toISOString()
            .slice(0, -1)
            .split("T", 2);

        if (this.#options.showDate) {
            return `${date} ${time}`;
        }

        return time;
    }

    /**
     * Logs a message with the specified severity level.
     *
     * @param severity The severity level of the log message.
     * @param message The message to be logged.
     * @param args Additional arguments to be interpolated into the log message.
     */
    #log(severity: LogSeverity, message: unknown, ...args: unknown[]): void {
        if (severity < this.#options.minSeverity) {
            return;
        }

        const datetime = this.#getDatetime();
        const fMessage = this.#formatMessage(message, ...args);
        const fSeverity = LogSeverityColor[severity];

        console.log(`[${datetime}] ${fSeverity} (${process.pid}) ${fMessage}`);

        if (this.#options.sentry.dsn !== undefined && severity >= this.#options.sentry.minSeverity) {
            const level = SentryLevel[severity];

            if (severity >= LogSeverity.ERROR) {
                const error = message instanceof Error
                    ? message
                    : args.find((a) => a instanceof Error);

                Sentry.captureException(error ?? fMessage, { level });
            } else {
                Sentry.captureMessage(fMessage, { level });
            }
        }
    }
}
