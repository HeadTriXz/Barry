<!-- Header -->
<div align="center">

[![Banner Barry][banner]][link-repo]

[![Build][badge-build]][link-build]
[![Coverage][badge-coverage]][link-coverage]
[![Contribute][badge-contribute]][link-contributing]
[![License][badge-license]][link-license-barry]

</div>

<div align="center">
    <h1>Barry - A Versatile Discord Bot</h1>
    <p>Barry is a versatile and user-friendly Discord bot designed to assist and enhance the workflow of creatives.</p>
</div>

<div align="center">

[![Add Barry][button-add]][link-invite]

</div>

<!-- Main Content -->
## Table of Contents
- [Features](#features)
- [Installation & Usage](#installation--usage)
    - [Run using Docker (preferred)](#run-using-docker-preferred)
    - [Run using NPM](#run-using-npm)
    - [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)

## Features
- Work in progress

![Waiting...](https://github.com/HeadTriXz/Barry/assets/32986761/ab4513c1-7471-4331-b0ee-fa26c976a2e9)

## Installation & Usage
### Run using Docker (preferred)

**Prerequisites**
- [Docker](https://docs.docker.com/get-docker/)
- [Git](https://git-scm.com/downloads) (if you haven't installed it already)

**Step 1: Clone the Repository**
```sh
git clone https://github.com/HeadTriXz/Barry.git
```

**Step 2: Configure the Bot**
1. Rename the `.env.example` file to `.env`.
2. Open the `.env` file and set the values of the **required** environment variables mentioned in [Configuration](#configuration).
3. Customize other settings in the `.env` file if desired.

**Step 3: Start Barry**
```sh
docker compose up -d
```

### Run using NPM

**Prerequisites**
- [Node.js](https://nodejs.org/en/download) (version 20 or later)
- [Git](https://git-scm.com/downloads) (if you haven't installed it already)

**Step 1: Clone the Repository**
```sh
git clone https://github.com/HeadTriXz/Barry.git
```

**Step 2: Install Dependencies**
```sh
npm install
```

**Step 3: Build Barry**
```sh
npx turbo run build --scope="barry"
```

**Step 4: Configure the Bot**
1. Rename the `.env.example` file to `.env`.
2. Open the `.env` file and set the values of the **required** environment variables mentioned in [Configuration](#configuration).
3. Customize other settings in the `.env` file if desired.

**Step 5: Start Barry**
```sh
npm start
```

### Configuration
#### How to obtain a Discord bot token?
1. Visit the [Discord Developer Portal](https://discord.com/developers/applications), and create a new application by clicking the `New Application` button. 
2. On the left menu, click `Bot` and then `Add Bot` to create a bot account for your application.
3. Now create a new token by pressing `Reset Token`, and then `Copy` to copy it to your clipboard. This will be needed for the `DISCORD_CLIENT_ID` environment variable.

> **Warning**
> Never share your token with anyone.

#### Environment Variables
The following environment variables **must be** set in order to run the application:
| Environment Variable | Description                                                                         |
|----------------------|-------------------------------------------------------------------------------------|
| DISCORD_CLIENT_ID    | The ID of your Discord application.                                                 |
| DISCORD_PUBLIC_KEY   | The public key of your Discord application.                                         |
| DISCORD_TOKEN        | The token of your Discord bot.                                                      |
| POSTGRES_HOST        | The hostname or IP address of the database. (default: `localhost`)                  |
| POSTGRES_PORT        | The port of the database. (default: `5432`)                                         |
| POSTGRES_DB          | The name of the database.                                                           |
| POSTGRES_PASSWORD    | The password for authenticating with the database.                                  |
| POSTGRES_USER        | The username for authenticating with the database.                                  |
| REDIS_HOST           | The hostname or IP address of redis. (default: `localhost`)                         |
| REDIS_PORT           | The port of redis. (default: `6379`)                                                |

The following environment variables are **optional**:
| Environment Variable | Description                                                             |
|----------------------|-------------------------------------------------------------------------|
| SENTRY_DSN           | The DSN of a project in Sentry.                                         |
| DEVELOPER_USERS      | A comma-separated list of user IDs that have full control over the bot. |
| DEVELOPER_GUILDS     | A comma-separated list of guild IDs that can be used for testing.       |

## Contributing
Contributions, bug reports, and feature requests are welcome! Please refer to the [contribution guidelines][link-contributing] for detailed information on how to contribute to the project.

Even if you're not a developer, you can still support the project in other ways. Consider donating to [my Ko-fi page][link-kofi] to show your appreciation and help me continue improving Barry. Every contribution is highly appreciated!

[![ko-fi][badge-kofi]][link-kofi]

## License
Barry is licensed under the **GNU Affero General Public License v3.0**. See the [LICENSE][link-license-barry] file for more information.

Please note that the licenses may differ between different parts of the project. Make sure to refer to the appropriate license file for each component.

<!-- Image References -->
[badge-build]:https://img.shields.io/github/actions/workflow/status/HeadTriXz/Barry/test.yml?branch=main&style=for-the-badge
[badge-coverage]:https://img.shields.io/codecov/c/github/HeadTriXz/Barry?style=for-the-badge&flag=barry
[badge-contribute]:https://img.shields.io/badge/contributions-welcome-orange.svg?style=for-the-badge
[badge-kofi]:https://ko-fi.com/img/githubbutton_sm.svg
[badge-license]:https://img.shields.io/badge/license-AGPL%20v3-blue.svg?style=for-the-badge
[banner]:https://github.com/HeadTriXz/Barry/assets/32986761/72d2c27d-925c-465f-a6a3-fe836e86fad6
[button-add]:https://img.shields.io/badge/Add%20Barry%20to%20your%20server-5865F2?style=for-the-badge&logo=discord&logoColor=white

<!-- Badge References -->
[link-build]:https://github.com/HeadTriXz/Barry/actions
[link-coverage]:https://codecov.io/gh/HeadTriXz/Barry
[link-invite]:https://discord.com/api/oauth2/authorize?client_id=592100299498586124&permissions=-8&scope=bot%20applications.commands

<!-- Links -->
[link-contributing]:https://github.com/HeadTriXz/Barry/blob/main/.github/CONTRIBUTING.md
[link-kofi]:https://ko-fi.com/headtrixz
[link-license-root]:https://github.com/HeadTriXz/Barry/blob/main/LICENSE
[link-license-barry]:https://github.com/HeadTriXz/Barry/blob/main/apps/barry/LICENSE
[link-repo]: https://github.com/HeadTriXz/Barry
