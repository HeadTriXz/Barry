import { type API, InteractionType, ComponentType } from "@discordjs/core";

import {
    Client,
    MessageButtonInteractionData,
    MessageChannelSelectInteractionData,
    MessageComponentInteraction,
    MessageComponentInteractionData,
    MessageComponentInteractionDataFactory,
    MessageMentionableSelectInteractionData,
    MessageRoleSelectInteractionData,
    MessageStringSelectInteractionData,
    MessageUserSelectInteractionData
} from "../../src/index.js";
import {
    createMockMessageComponentInteraction,
    mockInteractionChannel,
    mockInteractionMember,
    mockMessageButton,
    mockMessageChannelSelect,
    mockMessageMentionableSelect,
    mockMessageRoleSelect,
    mockMessageStringSelect,
    mockMessageUserSelect,
    mockRole,
    mockUser
} from "@barry-bot/testing";

describe("MessageComponentInteraction", () => {
    let client: Client;

    beforeEach(() => {
        client = new Client({
            applicationID: "49072635294295155",
            api: {} as API
        });
    });

    describe("constructor", () => {
        it("should should initialize the data and message properties correctly", () => {
            const data = createMockMessageComponentInteraction();
            const interaction = new MessageComponentInteraction(data, client);

            expect(interaction.type).toBe(InteractionType.MessageComponent);
            expect(interaction.data).toEqual({
                componentType: ComponentType.Button,
                customID: "button"
            });
            expect(interaction.message).toEqual(data.message);
        });
    });
});

describe("MessageComponentInteractionData", () => {
    describe("constructor", () => {
        it("should should initialize the type and id properties correctly", () => {
            const data = new MessageComponentInteractionData(mockMessageButton);

            expect(data.componentType).toBe(ComponentType.Button);
            expect(data.customID).toBe(mockMessageButton.custom_id);
        });
    });

    describe("isButton", () => {
        it("should return true when the message component type is BUTTON", () => {
            const data = new MessageComponentInteractionData(mockMessageButton);
            expect(data.isButton()).toBe(true);
        });

        it("should return false when the message component type is not BUTTON", () => {
            const data = new MessageComponentInteractionData(mockMessageChannelSelect);
            expect(data.isButton()).toBe(false);
        });
    });

    describe("isChannelSelect", () => {
        it("should return true when the message component type is CHANNEL_SELECT", () => {
            const data = new MessageComponentInteractionData(mockMessageChannelSelect);
            expect(data.isChannelSelect()).toBe(true);
        });

        it("should return false when the message component type is not CHANNEL_SELECT", () => {
            const data = new MessageComponentInteractionData(mockMessageMentionableSelect);
            expect(data.isChannelSelect()).toBe(false);
        });
    });

    describe("isMentionableSelect", () => {
        it("should return true when the message component type is MENTIONABLE_SELECT", () => {
            const data = new MessageComponentInteractionData(mockMessageMentionableSelect);
            expect(data.isMentionableSelect()).toBe(true);
        });

        it("should return false when the message component type is not MENTIONABLE_SELECT", () => {
            const data = new MessageComponentInteractionData(mockMessageRoleSelect);
            expect(data.isMentionableSelect()).toBe(false);
        });
    });

    describe("isRoleSelect", () => {
        it("should return true when the message component type is ROLE_SELECT", () => {
            const data = new MessageComponentInteractionData(mockMessageRoleSelect);
            expect(data.isRoleSelect()).toBe(true);
        });

        it("should return false when the message component type is not ROLE_SELECT", () => {
            const data = new MessageComponentInteractionData(mockMessageStringSelect);
            expect(data.isRoleSelect()).toBe(false);
        });
    });

    describe("isStringSelect", () => {
        it("should return true when the message component type is STRING_SELECT", () => {
            const data = new MessageComponentInteractionData(mockMessageStringSelect);
            expect(data.isStringSelect()).toBe(true);
        });

        it("should return false when the message component type is not STRING_SELECT", () => {
            const data = new MessageComponentInteractionData(mockMessageUserSelect);
            expect(data.isStringSelect()).toBe(false);
        });
    });

    describe("isUserSelect", () => {
        it("should return true when the message component type is USER_SELECT", () => {
            const data = new MessageComponentInteractionData(mockMessageUserSelect);
            expect(data.isUserSelect()).toBe(true);
        });

        it("should return false when the message component type is not USER_SELECT", () => {
            const data = new MessageComponentInteractionData(mockMessageButton);
            expect(data.isUserSelect()).toBe(false);
        });
    });
});

describe("MessageButtonInteractionData", () => {
    describe("componentType", () => {
        it("should have the componentType property set to BUTTON", () => {
            const data = new MessageButtonInteractionData(mockMessageButton);

            expect(data.componentType).toBe(ComponentType.Button);
        });
    });
});

describe("MessageChannelSelectInteractionData", () => {
    describe("constructor", () => {
        it("should initialize the values and resolved properties correctly", () => {
            const data = new MessageChannelSelectInteractionData(mockMessageChannelSelect);

            expect(data.componentType).toBe(ComponentType.ChannelSelect);
            expect(data.customID).toBe(mockMessageChannelSelect.custom_id);
            expect(data.values).toBe(mockMessageChannelSelect.values);

            expect(data.resolved.channels.get("30527482987641765")).toEqual(mockInteractionChannel);
        });
    });
});

describe("MessageMentionableSelectInteractionData", () => {
    describe("constructor", () => {
        it("should initialize the values and resolved properties correctly", () => {
            const data = new MessageMentionableSelectInteractionData(mockMessageMentionableSelect);

            expect(data.componentType).toBe(ComponentType.MentionableSelect);
            expect(data.customID).toBe(mockMessageMentionableSelect.custom_id);
            expect(data.values).toBe(mockMessageMentionableSelect.values);

            expect(data.resolved.members.get("257522665441460225")).toEqual(mockInteractionMember);
            expect(data.resolved.roles.get("68239102456844360")).toEqual(mockRole);
            expect(data.resolved.users.get("257522665441460225")).toEqual(mockUser);
        });

        it("should throw an error if resolved user data is missing while processing members", () => {
            expect(() => {
                new MessageMentionableSelectInteractionData({
                    ...mockMessageMentionableSelect,
                    resolved: {
                        ...mockMessageMentionableSelect.resolved,
                        users: undefined
                    }
                });
            }).toThrowError("Resolved user data is missing while processing members.");
        });
    });
});

describe("MessageRoleSelectInteractionData", () => {
    describe("constructor", () => {
        it("should initialize the values and resolved properties correctly", () => {
            const data = new MessageRoleSelectInteractionData(mockMessageRoleSelect);

            expect(data.componentType).toBe(ComponentType.RoleSelect);
            expect(data.customID).toBe(mockMessageRoleSelect.custom_id);
            expect(data.values).toBe(mockMessageRoleSelect.values);

            expect(data.resolved.roles.get("68239102456844360")).toEqual(mockRole);
        });
    });
});

describe("MessageStringSelectInteractionData", () => {
    describe("constructor", () => {
        it("should initialize the values and resolved properties correctly", () => {
            const data = new MessageStringSelectInteractionData(mockMessageStringSelect);

            expect(data.componentType).toBe(ComponentType.StringSelect);
            expect(data.customID).toBe(mockMessageStringSelect.custom_id);
            expect(data.values).toBe(mockMessageStringSelect.values);
        });
    });
});

describe("MessageUserSelectInteractionData", () => {
    describe("constructor", () => {
        it("should initialize the values and resolved properties correctly", () => {
            const data = new MessageUserSelectInteractionData(mockMessageUserSelect);

            expect(data.componentType).toBe(ComponentType.UserSelect);
            expect(data.customID).toBe(mockMessageUserSelect.custom_id);
            expect(data.values).toBe(mockMessageUserSelect.values);

            expect(data.resolved.members.get("257522665441460225")).toEqual(mockInteractionMember);
            expect(data.resolved.users.get("257522665441460225")).toEqual(mockUser);
        });
    });
});

describe("MessageComponentInteractionDataFactory", () => {
    it("should return the right subclass", () => {
        expect(
            MessageComponentInteractionDataFactory.from(mockMessageButton)
        ).toBeInstanceOf(MessageButtonInteractionData);

        expect(
            MessageComponentInteractionDataFactory.from(mockMessageStringSelect)
        ).toBeInstanceOf(MessageStringSelectInteractionData);

        expect(
            MessageComponentInteractionDataFactory.from(mockMessageUserSelect)
        ).toBeInstanceOf(MessageUserSelectInteractionData);

        expect(
            MessageComponentInteractionDataFactory.from(mockMessageRoleSelect)
        ).toBeInstanceOf(MessageRoleSelectInteractionData);

        expect(
            MessageComponentInteractionDataFactory.from(mockMessageMentionableSelect)
        ).toBeInstanceOf(MessageMentionableSelectInteractionData);

        expect(
            MessageComponentInteractionDataFactory.from(mockMessageChannelSelect)
        ).toBeInstanceOf(MessageChannelSelectInteractionData);
    });

    it("should return the base class for unknown types", () => {
        const mockUnknownComponent = {
            component_type: 26,
            custom_id: "unknown"
        };

        const data = MessageComponentInteractionDataFactory.from(mockUnknownComponent);
        expect(data).toBeInstanceOf(MessageComponentInteractionData);
    });
});
