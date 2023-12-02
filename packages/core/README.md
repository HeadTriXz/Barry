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
`@barry-bot/core` serves as the beating heart of [Barry](/apps/barry/), a versatile and user-friendly Discord bot designed to assist and enhance the workflow of creatives. With a focus on 
flexibility and extensibility, it offers a powerful foundation for building feature-rich bots with ease.

## Features
- **Command Handling**: Simplify the management of commands with built-in support for slash, message, and user commands. Easily define and handle commands, with automatic argument parsing for seamless user input processing.
- **Modular System**: Organize your bot's functionality into modules, each can have its own set of commands and event listeners, providing the flexibility to swap in and out functionality as needed.
- **Support for Gateway & HTTP**: Enjoy the best of both worlds with support for both **Gateway** events and **HTTP** interactions. Choose whatever suits your needs, whether you prefer the real-time nature of Gateway events or the scalability of HTTP interactions.
- **Stability and Compatibility**: `@barry-bot/core` strives to stay close to the Discord API, minimizing breaking changes and ensuring compatibility with the latest Discord features and updates. This allows you to build your bot with confidence, knowing that it will continue to function reliably.


## Installation
[Node.js](https://nodejs.org/en/download) version 20 or later is required.
```sh
npm install @barry-bot/core
# or
yarn add @barry-bot/core
```

## Example Usage
```ts
import { Client, FastifyServer, Module, SlashCommand } from "@barry-bot/core";
import { API } from "@discordjs/core";
import { REST } from "@discordjs/rest";

// Basic module & command
class GeneralModule extends Module {
    constructor(client) {
        super(client, {
            id: "general",
            name: "General",
            description: "Provides general functionality and commands.",
            commands: [PingCommand]
        });
    }
}

class PingCommand extends SlashCommand {
    constructor(module) {
        super(module, {
            name: "ping",
            description: "Shows the latency of the bot."
        });
    }

    async execute(interaction) {
        await interaction.createMessage({
            content: "Pong! 🏓"
        });
    }
}

// Initialize the server.
const server = new FastifyServer({
    publicKey: "PUBLIC_KEY"
});

// Initialize the client.
const rest = new REST().setToken("TOKEN");
const api = new API(rest);

const client = new Client({
    api: api,
    applicationID: "APPLICATION_ID",
    modules: [GeneralModule],
    server: server
});

// Start the server.
await server.listen(3000, "localhost");

// Start the client.
await client.initialize();
await client.commands.sync();
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
[badge-coverage]:https://img.shields.io/codecov/c/github/HeadTriXz/Barry?style=for-the-badge&flag=core
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
