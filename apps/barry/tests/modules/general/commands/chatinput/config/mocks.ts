import type { BaseSettings, SettingsRepository } from "../../../../../../src/types/modules.js";
import type { Application } from "../../../../../../src/Application.js";

import {
    BooleanGuildSettingOption,
    ChannelArrayGuildSettingOption,
    ChannelGuildSettingOption,
    EmojiGuildSettingOption,
    EnumGuildSettingOption,
    FloatGuildSettingOption,
    IntegerGuildSettingOption,
    RoleArrayGuildSettingOption,
    RoleGuildSettingOption,
    StringGuildSettingOption
} from "../../../../../../src/config/options/index.js";
import { ConfigurableModule } from "../../../../../../src/config/module.js";
import { CustomGuildSettingOption } from "../../../../../../src/config/option.js";
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

export const mockChannelOption = new ChannelGuildSettingOption<MockSettings, "channelID">({
    description: "Hello World!",
    name: "Channel"
});

export const mockChannelArrayOption = new ChannelArrayGuildSettingOption<MockSettings, "channels">({
    description: "Hello World!",
    name: "Channels"
});

export const mockEmojiOption = new EmojiGuildSettingOption<MockSettings, "emojiID", "emojiName">({
    description: "Hello World!",
    emojiKeys: {
        id: "emojiID",
        name: "emojiName"
    },
    name: "Emoji"
});

export const mockBooleanOption = new BooleanGuildSettingOption<MockSettings, "enabled">({
    description: "Hello World!",
    name: "Enabled"
});

export const mockIntegerOption = new IntegerGuildSettingOption<MockSettings, "min">({
    description: "Hello World!",
    name: "Minimum"
});

export const mockFloatOption = new FloatGuildSettingOption<MockSettings, "max">({
    description: "Hello World!",
    name: "Maximum"
});

export const mockCustomOption = new CustomGuildSettingOption({
    description: "Hello World!",
    name: "Random",
    onEdit: vi.fn(),
    onView: vi.fn().mockResolvedValue("mock")
});

export const mockRoleOption = new RoleGuildSettingOption<MockSettings, "roleID">({
    description: "Hello World!",
    name: "Role"
});

export const mockRoleArrayOption = new RoleArrayGuildSettingOption<MockSettings, "roles">({
    description: "Hello World!",
    name: "Roles"
});

export const mockStringOption = new StringGuildSettingOption<MockSettings, "text">({
    description: "Hello World!",
    name: "Text"
});

export const mockEnumOption = new EnumGuildSettingOption<MockSettings, "type">({
    description: "Hello World!",
    name: "Type",
    values: ["Foo", "Bar", "Baz"]
});

export class MockModule extends ConfigurableModule<MockModule> {
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
                roleID: mockRoleOption,
                roles: mockRoleArrayOption,
                text: mockStringOption,
                type: mockEmojiOption
            }
        });

        this.defineCustom(mockCustomOption);
    }

    async isEnabled(guildID: string): Promise<boolean> {
        const settings = await this.settings.getOrCreate(guildID);
        return settings.enabled;
    }
}
