import type { BaseSettings, SettingsRepository } from "../../../../../../src/types/modules.js";
import type { Application } from "../../../../../../src/Application.js";

import { ConfigurableModule, GuildSettingOptionBuilder } from "../../../../../../src/ConfigurableModule.js";
import { mockDeep } from "vitest-mock-extended";

export interface MockSettings extends BaseSettings {
    channelID: string;
    channels: string[];
    emojiID: string | null;
    emojiName: string;
    enabled: boolean;
    max: number;
    min: number;
    random: string;
    roleID: string;
    roles: string[];
    text: string;
    type: MockType;
}

export enum MockType {
    Foo = "Foo",
    Bar = "Bar",
    Baz = "Baz"
}

export const mockSettings = {
    channelID: "30527482987641760",
    channels: ["30527482987641760"],
    emojiID: null,
    emojiName: "mock",
    enabled: false,
    guildID: "68239102456844360",
    max: 10,
    min: 0,
    random: "mock",
    roleID: "68239102456844365",
    roles: ["68239102456844365"],
    text: "mock",
    type: MockType.Foo
};

export const mockChannelOption = GuildSettingOptionBuilder.channel({
    description: "Hello World!",
    name: "Channel"
});

export const mockChannelArrayOption = GuildSettingOptionBuilder.channelArray({
    description: "Hello World!",
    name: "Channels"
});

export const mockEmojiOption = GuildSettingOptionBuilder.emoji({
    description: "Hello World!",
    emojiKeys: {
        id: "emojiID",
        name: "emojiName"
    },
    name: "Emoji"
});

export const mockBooleanOption = GuildSettingOptionBuilder.boolean({
    description: "Hello World!",
    name: "Enabled"
});

export const mockIntegerOption = GuildSettingOptionBuilder.integer({
    description: "Hello World!",
    name: "Minimum"
});

export const mockFloatOption = GuildSettingOptionBuilder.float({
    description: "Hello World!",
    name: "Maximum"
});

export const mockCustomOption = GuildSettingOptionBuilder.custom({
    callback: vi.fn(),
    description: "Hello World!",
    name: "Random"
});

export const mockRoleOption = GuildSettingOptionBuilder.role({
    description: "Hello World!",
    name: "Role"
});

export const mockRoleArrayOption = GuildSettingOptionBuilder.roleArray({
    description: "Hello World!",
    name: "Roles"
});

export const mockStringOption = GuildSettingOptionBuilder.string({
    description: "Hello World!",
    name: "Text"
});

export const mockEnumOption = GuildSettingOptionBuilder.enum({
    description: "Hello World!",
    name: "Type",
    values: ["Foo", "Bar", "Baz"]
});

export class MockModule extends ConfigurableModule<MockSettings> {
    settings: SettingsRepository<MockSettings>;

    constructor(client: Application) {
        super(client, {
            id: "mock",
            name: "Mock",
            description: "A mock module."
        });

        this.settings = mockDeep<SettingsRepository<MockSettings>>();
        this.defineConfig({
            settings: {
                channelID: mockChannelOption,
                channels: mockChannelArrayOption,
                emojiName: mockEmojiOption,
                enabled: mockBooleanOption,
                min: mockIntegerOption,
                max: mockFloatOption,
                random: mockCustomOption,
                roleID: mockRoleOption,
                roles: mockRoleArrayOption,
                text: mockStringOption,
                type: mockEmojiOption
            }
        });
    }

    async isEnabled(guildID: string): Promise<boolean> {
        const settings = await this.settings.getOrCreate(guildID);
        return settings.enabled;
    }
}
