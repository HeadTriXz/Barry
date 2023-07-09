/**
 * Represents a function that can be used to log a message.
 *
 * @param message The message to be logged.
 * @param args Additional arguments to be interpolated into the log message.
 */
export type LogFunction = (message: unknown, ...args: unknown[]) => void;

/**
 * Represents a logger with log functions for different severity levels.
 */
export interface BaseLogger {
    /**
     * Logs a debug message.
     *
     * @param message The debug message.
     * @param args Additional arguments to be interpolated into the log message.
     */
    debug: LogFunction;

    /**
     * Logs an error message.
     *
     * @param message The error message.
     * @param args Additional arguments to be interpolated into the log message.
     */
    error: LogFunction;

    /**
     * Logs a fatal message.
     *
     * @param message The fatal message.
     * @param args Additional arguments to be interpolated into the log message.
     */
    fatal: LogFunction;

    /**
     * Logs an info message.
     *
     * @param message The info message.
     * @param args Additional arguments to be interpolated into the log message.
     */
    info: LogFunction;

    /**
     * Logs a trace message.
     *
     * @param message The trace message.
     * @param args Additional arguments to be interpolated into the log message.
     */
    trace: LogFunction;

    /**
     * Logs a warning message.
     *
     * @param message The warning message.
     * @param args Additional arguments to be interpolated into the log message.
     */
    warn: LogFunction;
}

/**
 * Represents the options for configuring the logger.
 */
export interface LoggerOptions {
    /**
     * The environment of the application (e.g.: "development" or "production").
     */
    environment: string;

    /**
     * The minimum log severity level.
     */
    minSeverity: LogSeverity;

    /**
     * The options for configuring Sentry integration.
     */
    sentry: SentryOptions;

    /**
     * Indicates whether to show the date in log messages.
     */
    showDate: boolean;
}

/**
 * Represents the options for configuring Sentry integration.
 */
export interface SentryOptions {
    /**
     * The DSN for connecting to Sentry.
     */
    dsn?: string;

    /**
     * The minimum log severity level to send to Sentry.
     */
    minSeverity: LogSeverity;

    /**
     * The name of the server to send to Sentry.
     */
    serverName?: string;
}

/**
 * Represents the severity levels of log messages.
 */
export enum LogSeverity {
    TRACE,
    DEBUG,
    INFO,
    WARN,
    ERROR,
    FATAL
}
