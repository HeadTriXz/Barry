import { ApplicationCommandType, ApplicationIntegrationType, InteractionContextType } from "@discordjs/core";
import {
    type ApplicationCommandOptions,
    type Module,
    type SlashCommandOptions,
    BaseCommand,
    MessageCommand,
    SlashCommand,
    SlashCommandOptionBuilder,
    UserCommand
} from "../../src/index.js";

export class MockBaseCommand extends BaseCommand {
    type: ApplicationCommandType = ApplicationCommandType.ChatInput;

    constructor(module: Module, options: Partial<ApplicationCommandOptions> = {}) {
        super(module, {
            name: "ping",
            ...options
        });
    }

    async execute(): Promise<void> {
        // empty...
    }
}

export class MockMessageCommand extends MessageCommand {
    constructor(module: Module, options: Partial<ApplicationCommandOptions> = {}) {
        super(module, {
            name: "ping",
            ...options
        });
    }

    async execute(): Promise<void> {
        // empty...
    }
}

export class MockSlashCommand extends SlashCommand {
    constructor(module: Module, options: Partial<SlashCommandOptions> = {}) {
        super(module, {
            name: "ping",
            description: "Mock subcommand for testing purposes",
            ...options
        });
    }

    async execute(): Promise<void> {
        // empty...
    }
}

export class MockUserCommand extends UserCommand {
    constructor(module: Module, options: Partial<ApplicationCommandOptions> = {}) {
        super(module, {
            name: "ping",
            ...options
        });
    }

    async execute(): Promise<void> {
        // empty...
    }
}

export class MockSlashCommandFooBar extends SlashCommand {
    constructor(module: Module) {
        super(module, {
            name: "bar",
            description: "Mock subcommand for testing purposes"
        });
    }

    async execute(): Promise<void> {
        // empty...
    }
}

export class MockSlashCommandFoo extends SlashCommand {
    constructor(module: Module) {
        super(module, {
            name: "foo",
            description: "Mock subcommand for testing purposes",
            children: [MockSlashCommandFooBar]
        });
    }

    async execute(): Promise<void> {
        // empty...
    }
}

export class MockSlashCommandBar extends SlashCommand {
    constructor(module: Module) {
        super(module, {
            name: "bar",
            description: "Mock subcommand for testing purposes"
        });
    }

    async execute(): Promise<void> {
        // empty...
    }
}

export const baseCommandOptions: ApplicationCommandOptions = {
    appPermissions: 2112n,
    contexts: [InteractionContextType.Guild],
    cooldown: 5,
    defaultMemberPermissions: 512n,
    guilds: ["68239102456844360", "30527482987641765"],
    integrationTypes: [ApplicationIntegrationType.GuildInstall],
    name: "test",
    nameLocalizations: {
        "en-US": "Test",
        "fr": "Baguette"
    },
    nsfw: true,
    ownerOnly: true
};

export const baseSlashCommandOptions: SlashCommandOptions = {
    name: "test",
    description: "Mock command for testing purposes"
};

export const slashCommandOptions: SlashCommandOptions = {
    ...baseCommandOptions,
    ...baseSlashCommandOptions,
    children: [MockSlashCommandFoo, MockSlashCommandBar],
    descriptionLocalizations: {
        "en-US": "Mock command for testing purposes",
        "fr": "Commande fictive à des fins de test"
    },
    options: {
        foo: SlashCommandOptionBuilder.number({
            description: "Lorem ipsum dolor sit amet.",
            maximum: 100,
            minimum: 10,
            required: true
        }),
        bar: SlashCommandOptionBuilder.boolean({
            description: "Lorem ipsum dolor sit amet."
        })
    }
};
