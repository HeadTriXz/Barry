import {
    type APIAttachment,
    type APIGuildMember,
    type APIInteractionDataResolvedChannel,
    type APIInteractionGuildMember,
    type APIMessage,
    type APIPartialChannel,
    type APIRole,
    type APIUser,
    ChannelType
} from "@discordjs/core";

/**
 * Represents a mock attachment.
 */
export const mockAttachment = {
    content_type: "image/png",
    filename: "foo.png",
    id: "71272489110250160",
    proxy_url: "https://cdn.discordapp.com/attachments/68239102456844360/71272489110250160/foo.png",
    size: 1024,
    url: "https://cdn.discordapp.com/attachments/68239102456844360/71272489110250160/foo.png"
} satisfies APIAttachment;

/**
 * Represents a channel.
 */
export const mockChannel = {
    id: "30527482987641765",
    name: "general",
    type: ChannelType.GuildText
} satisfies APIPartialChannel;

/**
 * Represents a mock interaction channel.
 */
export const mockInteractionChannel = {
    ...mockChannel,
    permissions: "2112"
} satisfies APIInteractionDataResolvedChannel;

/**
 * Represents a mock role.
 */
export const mockRole = {
    color: 0xFF0000,
    hoist: true,
    id: "68239102456844360",
    managed: false,
    mentionable: false,
    name: "Member",
    permissions: "2112",
    position: 0
} satisfies APIRole;

/**
 * Represents a mock user.
 */
export const mockUser = {
    avatar: "9507a0067e219e749e74a678d14b791a",
    discriminator: "0",
    global_name: "HeadTriXz",
    id: "257522665441460225",
    username: "headtrixz"
} satisfies APIUser;

/**
 * Represents a mock guild member.
 */
export const mockMember = {
    avatar: null,
    deaf: false,
    flags: 2,
    joined_at: "2021-05-19T02:12:51.710000+00:00",
    mute: false,
    roles: [],
    user: mockUser
} satisfies APIGuildMember;

/**
 * Represents a mock interaction guild member.
 */
export const mockInteractionMember = {
    ...mockMember,
    permissions: "2112"
} satisfies APIInteractionGuildMember;

/**
 * Represents a mock message.
 */
export const mockMessage = {
    attachments: [],
    author: mockUser,
    channel_id: "30527482987641765",
    content: "Hello World",
    edited_timestamp: null,
    embeds: [],
    id: "91256340920236565",
    mentions: [],
    mention_everyone: false,
    mention_roles: [],
    pinned: false,
    timestamp: "2021-05-19T02:12:51.710000+00:00",
    tts: false,
    type: 0
} satisfies APIMessage;

/**
 * Represents a collection of resolved data.
 */
export const mockResolvedData = {
    attachments: { "71272489110250160": mockAttachment },
    channels: { "30527482987641765": mockInteractionChannel },
    members: { "257522665441460225": mockInteractionMember },
    messages: { "91256340920236565": mockMessage },
    roles: { "68239102456844360": mockRole },
    users: { "257522665441460225": mockUser }
};
