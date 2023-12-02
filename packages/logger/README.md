<!-- Header -->
<div align="center">

[![Banner Barry][banner]][link-repo]

[![Build][badge-build]][link-build]
[![Coverage][badge-coverage]][link-coverage]
[![Contribute][badge-contribute]][link-contributing]
[![License][badge-license]][link-license]

</div>

<!-- Main Content -->
## About
`@barry-bot/logger` is a powerful logger package that provides a flexible and customizable logging solution for Node.js applications. It offers various features such as log severity levels, error handling, log formatting, and integration with Sentry for error reporting.

## Features
- **Log Severity Levels**: Log messages with different severity levels such as `DEBUG`, `ERROR`, `FATAL`, `INFO`, `TRACE`, and `WARN`.
- **Sentry Integration**: Integrate with Sentry for advanced error tracking and reporting.
- **Flexible Configuration**: Customize the logger options to control log behavior, minimum severity level, date display, and more.
- **Log Formatting**: Format log messages using printf-style string interpolation.
- **Colorful Output**: Log messages are displayed with colors based on their severity level for easy visual identification.

## Installation
[Node.js](https://nodejs.org/en/download) version 20 or later is required.
```sh
npm install @barry-bot/logger
# or
yarn add @barry-bot/logger
```

## Example Usage
```ts
import { Logger, LogSeverity } from "@barry-bot/logger";

// Create a new logger instance.
const logger = new Logger({
    minSeverity: LogSeverity.INFO,
    showDate: true,
    sentry: {
        dsn: "YOUR_SENTRY_DSN",
        minSeverity: LogSeverity.Error
    }
});

// Log messages with different severity levels.
logger.trace("This is a trace message");
logger.debug("This is a debug message");
logger.info("This is an info message");
logger.warn("This is a warning message");
logger.error("This is an error message");
logger.fatal("This is a fatal message");

// Log formatted messages using printf-style string interpolation.
logger.info("Hello %s", "World");

// Log an error.
const error = new Error("Oh no!");
logger.fatal("An error has occurred:", error);
```

## Contributing
Contributions, bug reports, and feature requests are welcome! Please refer to the [contribution guidelines][link-contributing] for detailed information on how to contribute to the project.

Even if you're not a developer, you can still support the project in other ways. Consider donating to [my Ko-fi page][link-kofi] to show your appreciation and help me continue improving Barry. Every contribution is highly appreciated!

[![ko-fi][badge-kofi]][link-kofi]

## License
This package is licensed under the MIT License. See the [LICENSE][link-license] file for more information.

Please note that the licenses may differ between different parts of the project. Make sure to refer to the appropriate license file for each component.

<!-- Image References -->
[badge-build]:https://img.shields.io/github/actions/workflow/status/HeadTriXz/Barry/test.yml?branch=main&style=for-the-badge
[badge-coverage]:https://img.shields.io/codecov/c/github/HeadTriXz/Barry?style=for-the-badge&flag=logger
[badge-contribute]:https://img.shields.io/badge/contributions-welcome-orange.svg?style=for-the-badge
[badge-kofi]:https://ko-fi.com/img/githubbutton_sm.svg
[badge-license]:https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge
[banner]:https://github.com/HeadTriXz/Barry/assets/32986761/72d2c27d-925c-465f-a6a3-fe836e86fad6

<!-- Badge References -->
[link-build]:https://github.com/HeadTriXz/Barry/actions
[link-coverage]:https://codecov.io/gh/HeadTriXz/Barry

<!-- Links -->
[link-contributing]:https://github.com/HeadTriXz/Barry/blob/main/.github/CONTRIBUTING.md
[link-kofi]:https://ko-fi.com/headtrixz
[link-license]:https://github.com/HeadTriXz/Barry/blob/main/LICENSE
[link-repo]: https://github.com/HeadTriXz/Barry
