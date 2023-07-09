import { MessageCommand } from "./MessageCommand.js";
import { SlashCommand } from "./SlashCommand.js";
import { UserCommand } from "./UserCommand.js";

export type AnyCommand = MessageCommand
    | SlashCommand
    | UserCommand;

export { type ApplicationCommandOptions, BaseCommand } from "./BaseCommand.js";
export type { MessageCommandTarget } from "./MessageCommand.js";
export type { SlashCommandOptions } from "./SlashCommand.js";
export type { UserCommandTarget } from "./UserCommand.js";

export {
    MessageCommand,
    SlashCommand,
    UserCommand
};

export { SlashCommandOptionBuilder } from "./SlashCommandOptionBuilder.js";
