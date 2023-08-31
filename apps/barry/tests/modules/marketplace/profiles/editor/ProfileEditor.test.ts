import { type ProfilesSettings, ProfileCreationStatus } from "@prisma/client";

import { ComponentType, MessageFlags } from "@discordjs/core";
import {
    MessageComponentInteraction,
    ModalSubmitInteraction,
    UpdatableInteraction
} from "@barry/core";
import {
    createMockMessageComponentInteraction,
    createMockModalSubmitInteraction,
    mockChannel,
    mockMessage,
    mockUser
} from "@barry/testing";
import { retryComponents, timeoutContent } from "../../../../../src/modules/marketplace/constants.js";

import { DiscordAPIError } from "@discordjs/rest";
import { ProfileEditor } from "../../../../../src/modules/marketplace/dependencies/profiles/editor/ProfileEditor.js";
import { createMockApplication } from "../../../../mocks/application.js";
import { mockProfile } from "../mocks/profile.js";

import ProfilesModule from "../../../../../src/modules/marketplace/dependencies/profiles/index.js";
import * as utils from "../../../../../src/modules/marketplace/utils.js";

describe("ProfileEditor", () => {
    let interaction: UpdatableInteraction;
    let module: ProfilesModule;

    beforeEach(() => {
        const client = createMockApplication();
        module = new ProfilesModule(client);

        const data = createMockModalSubmitInteraction();
        interaction = new UpdatableInteraction(data, client, vi.fn());

        vi.spyOn(client.api.users, "createDM").mockResolvedValue({ ...mockChannel, position: 0 });
        vi.spyOn(client.api.channels, "createMessage").mockResolvedValue(mockMessage);
        vi.spyOn(client.api.channels, "editMessage").mockResolvedValue(mockMessage);
        vi.spyOn(interaction, "editOriginalMessage").mockResolvedValue(mockMessage);
    });

    describe("editAvailability", () => {
        it("should update the profile with the correct data if the interaction is valid", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "create_profile_2",
                values: ["1", "8", "32"]
            });

            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(
                new MessageComponentInteraction(data, module.client, vi.fn())
            );

            const upsertSpy = vi.spyOn(module.profiles, "upsert");
            const editor = new ProfileEditor(module, true, mockProfile);
            editor.next = vi.fn();

            await editor.editAvailability(interaction);

            expect(upsertSpy).toHaveBeenCalledOnce();
            expect(upsertSpy).toHaveBeenCalledWith(mockUser.id, {
                availability: 41,
                creationStatus: null
            });
        });

        it("should update the creation status if the user is creating a new profile", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "create_profile_2",
                values: ["1", "8", "32"]
            });

            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(
                new MessageComponentInteraction(data, module.client, vi.fn())
            );

            const upsertSpy = vi.spyOn(module.profiles, "upsert");
            const editor = new ProfileEditor(module, false, mockProfile);
            editor.next = vi.fn();

            await editor.editAvailability(interaction);

            expect(upsertSpy).toHaveBeenCalledOnce();
            expect(upsertSpy).toHaveBeenCalledWith(mockUser.id, {
                availability: 41,
                creationStatus: ProfileCreationStatus.Contact
            });
        });

        it("should go to the next step if the profile got updated successfully", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.StringSelect,
                custom_id: "create_profile_2",
                values: ["1", "8", "32"]
            });

            const response = new MessageComponentInteraction(data, module.client, vi.fn());
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);

            const upsertSpy = vi.spyOn(module.profiles, "upsert");
            const editor = new ProfileEditor(module, false, mockProfile);
            editor.next = vi.fn();

            await editor.editAvailability(interaction);

            expect(upsertSpy).toHaveBeenCalledOnce();
            expect(upsertSpy).toHaveBeenCalledWith(mockUser.id, {
                availability: 41,
                creationStatus: ProfileCreationStatus.Contact
            });
            expect(editor.next).toHaveBeenCalledOnce();
            expect(editor.next).toHaveBeenCalledWith(response);
        });

        it("should show a timeout message if the user did not respond", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

            const editSpy = vi.spyOn(interaction, "editParent");
            const upsertSpy = vi.spyOn(module.profiles, "upsert");
            const editor = new ProfileEditor(module, false, mockProfile);

            await editor.editAvailability(interaction);

            expect(upsertSpy).not.toHaveBeenCalled();
            expect(editSpy).toHaveBeenCalledTimes(2);
            expect(editSpy).toHaveBeenCalledWith(timeoutContent);
        });

        it("should ignore the interaction if it is not a string select component", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "create_profile_2"
            });

            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(
                new MessageComponentInteraction(data, module.client, vi.fn())
            );

            const upsertSpy = vi.spyOn(module.profiles, "upsert");
            const editor = new ProfileEditor(module, true, mockProfile);

            await editor.editAvailability(interaction);

            expect(upsertSpy).not.toHaveBeenCalled();
        });
    });

    describe("editBanner", () => {
        let error: Error;

        beforeEach(() => {
            const response = {
                code: 50007,
                message: "Cannot send messages to this user"
            };

            error = new DiscordAPIError(response, 50007, 200, "GET", "", {});
        });

        it("should update the profile with the new banner if valid", async () => {
            vi.spyOn(module.client, "awaitMessage").mockResolvedValue({
                ...mockMessage,
                attachments: [{
                    content_type: "image/png",
                    filename: "new-banner.png",
                    id: "0",
                    proxy_url: "https://example.com/new-banner.png",
                    size: 1024,
                    url: "https://example.com/new-banner.png"
                }]
            });

            const upsertSpy = vi.spyOn(module.profiles, "upsert");
            const editor = new ProfileEditor(module, true, mockProfile);
            editor.showPreview = vi.fn();

            await editor.editBanner(interaction, mockChannel.id, true);

            expect(upsertSpy).toHaveBeenCalledOnce();
            expect(upsertSpy).toHaveBeenCalledWith(mockUser.id, {
                bannerURL: "https://example.com/new-banner.png",
                creationStatus: null
            });
        });

        it("should update the creation status if the user is creating a new profile", async () => {
            vi.spyOn(module.client, "awaitMessage").mockResolvedValue({
                ...mockMessage,
                attachments: [{
                    content_type: "image/png",
                    filename: "new-banner.png",
                    id: "0",
                    proxy_url: "https://example.com/new-banner.png",
                    size: 1024,
                    url: "https://example.com/new-banner.png"
                }]
            });

            const upsertSpy = vi.spyOn(module.profiles, "upsert");
            const editor = new ProfileEditor(module, false, mockProfile);
            editor.showPreview = vi.fn();

            await editor.editBanner(interaction, mockChannel.id, true);

            expect(upsertSpy).toHaveBeenCalledOnce();
            expect(upsertSpy).toHaveBeenCalledWith(mockUser.id, {
                bannerURL: "https://example.com/new-banner.png",
                creationStatus: ProfileCreationStatus.Preview
            });
        });

        it("should send an error message if the DMs are disabled", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);
            vi.spyOn(module.client.api.channels, "createMessage").mockRejectedValue(error);

            const editSpy = vi.spyOn(interaction, "editParent");
            const upsertSpy = vi.spyOn(module.profiles, "upsert");
            const editor = new ProfileEditor(module, false, mockProfile);
            editor.showPreview = vi.fn();

            await editor.editBanner(interaction, mockChannel.id, true);

            expect(editSpy).toHaveBeenCalledTimes(2);
            expect(editSpy).toHaveBeenCalledWith({
                components: retryComponents,
                content: expect.stringContaining("I'm unable to send you a direct message. Please make sure you have your DMs enabled.")
            });
            expect(upsertSpy).not.toHaveBeenCalled();
        });

        it("should correctly handle the 'Retry' button when DMs are disabled", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "retry"
            });

            vi.spyOn(module.client, "awaitMessage").mockResolvedValue({
                ...mockMessage,
                attachments: [{
                    content_type: "image/png",
                    filename: "new-banner.png",
                    id: "0",
                    proxy_url: "https://example.com/new-banner.png",
                    size: 1024,
                    url: "https://example.com/new-banner.png"
                }]
            });
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(
                new MessageComponentInteraction(data, module.client, vi.fn())
            );
            vi.spyOn(module.client.api.channels, "createMessage")
                .mockRejectedValueOnce(error)
                .mockResolvedValue(mockMessage);

            const upsertSpy = vi.spyOn(module.profiles, "upsert");
            const editor = new ProfileEditor(module, false, mockProfile);
            const bannerSpy = vi.spyOn(editor, "editBanner");
            editor.showPreview = vi.fn();

            await editor.editBanner(interaction, mockChannel.id, true);

            expect(bannerSpy).toHaveBeenCalledTimes(2);
            expect(upsertSpy).toHaveBeenCalledOnce();
            expect(upsertSpy).toHaveBeenCalledWith(mockUser.id, {
                bannerURL: "https://example.com/new-banner.png",
                creationStatus: ProfileCreationStatus.Preview
            });
        });

        it("should correctly handle the 'Continue' button when DMs are disabled", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "continue"
            });

            vi.spyOn(module.client.api.channels, "createMessage").mockRejectedValueOnce(error);
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(
                new MessageComponentInteraction(data, module.client, vi.fn())
            );

            const upsertSpy = vi.spyOn(module.profiles, "upsert");
            const editor = new ProfileEditor(module, false, mockProfile);
            editor.showPreview = vi.fn();

            await editor.editBanner(interaction, mockChannel.id, true);

            expect(upsertSpy).toHaveBeenCalledOnce();
            expect(upsertSpy).toHaveBeenCalledWith(mockUser.id, {
                creationStatus: ProfileCreationStatus.Preview
            });
        });

        it("should send an error message if the message does not contain images", async () => {
            vi.spyOn(module.client, "awaitMessage").mockResolvedValue(mockMessage);
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

            const createSpy = vi.spyOn(module.client.api.channels, "createMessage");
            const upsertSpy = vi.spyOn(module.profiles, "upsert");
            const editor = new ProfileEditor(module, false, mockProfile);
            editor.showPreview = vi.fn();

            await editor.editBanner(interaction, mockChannel.id, true);

            expect(createSpy).toHaveBeenCalledTimes(3);
            expect(createSpy).toHaveBeenCalledWith(mockChannel.id, {
                components: retryComponents,
                content: expect.stringContaining("There are no images in that message.")
            });
            expect(upsertSpy).not.toHaveBeenCalled();
        });

        it("should correctly handle the 'Retry' button when the message does not contain images", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "retry"
            });

            vi.spyOn(module.client, "awaitMessage")
                .mockResolvedValueOnce(mockMessage)
                .mockResolvedValue({
                    ...mockMessage,
                    attachments: [{
                        content_type: "image/png",
                        filename: "new-banner.png",
                        id: "0",
                        proxy_url: "https://example.com/new-banner.png",
                        size: 1024,
                        url: "https://example.com/new-banner.png"
                    }]
                });
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(
                new MessageComponentInteraction(data, module.client, vi.fn())
            );

            const upsertSpy = vi.spyOn(module.profiles, "upsert");
            const editor = new ProfileEditor(module, false, mockProfile);
            editor.showPreview = vi.fn();

            await editor.editBanner(interaction, mockChannel.id, true);

            expect(upsertSpy).toHaveBeenCalledOnce();
            expect(upsertSpy).toHaveBeenCalledWith(mockUser.id, {
                bannerURL: "https://example.com/new-banner.png",
                creationStatus: ProfileCreationStatus.Preview
            });
        });

        it("should correctly handle the 'Continue' button when the message does not contain images", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "continue"
            });

            vi.spyOn(module.client, "awaitMessage").mockResolvedValueOnce(mockMessage);
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(
                new MessageComponentInteraction(data, module.client, vi.fn())
            );

            const upsertSpy = vi.spyOn(module.profiles, "upsert");
            const editor = new ProfileEditor(module, false, mockProfile);
            editor.showPreview = vi.fn();

            await editor.editBanner(interaction, mockChannel.id, true);

            expect(upsertSpy).toHaveBeenCalledOnce();
            expect(upsertSpy).toHaveBeenCalledWith(mockUser.id, {
                creationStatus: ProfileCreationStatus.Preview
            });
        });


        it("should show a timeout message if the user did not respond", async () => {
            vi.spyOn(module.client, "awaitMessage").mockResolvedValue(undefined);

            const createSpy = vi.spyOn(module.client.api.channels, "createMessage");
            const upsertSpy = vi.spyOn(module.profiles, "upsert");
            const editor = new ProfileEditor(module, false, mockProfile);
            editor.showPreview = vi.fn();

            await editor.editBanner(interaction, mockChannel.id, true);

            expect(upsertSpy).not.toHaveBeenCalled();
            expect(createSpy).toHaveBeenCalledTimes(2);
            expect(createSpy).toHaveBeenCalledWith(mockChannel.id, timeoutContent);
        });
    });

    describe("editContact", () => {
        it("should update the profile with the correct data if the interaction is valid", async () => {
            const data = createMockModalSubmitInteraction({
                components: [{
                    components: [{
                        custom_id: "contact",
                        type: ComponentType.TextInput,
                        value: "Send me a direct message!"
                    }],
                    type: ComponentType.ActionRow
                }],
                custom_id: `${Date.now()}_create_profile_3`
            });

            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(
                new ModalSubmitInteraction(data, module.client, vi.fn())
            );

            const upsertSpy = vi.spyOn(module.profiles, "upsert");
            const editor = new ProfileEditor(module, true, mockProfile);
            editor.next = vi.fn();

            await editor.editContact(interaction);

            expect(upsertSpy).toHaveBeenCalledOnce();
            expect(upsertSpy).toHaveBeenCalledWith(mockUser.id, {
                contact: "Send me a direct message!",
                creationStatus: null
            });
        });

        it("should update the creation status if the user is creating a new profile", async () => {
            const data = createMockModalSubmitInteraction({
                components: [{
                    components: [{
                        custom_id: "contact",
                        type: ComponentType.TextInput,
                        value: "Send me a direct message!"
                    }],
                    type: ComponentType.ActionRow
                }],
                custom_id: `${Date.now()}_create_profile_3`
            });

            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(
                new ModalSubmitInteraction(data, module.client, vi.fn())
            );

            const upsertSpy = vi.spyOn(module.profiles, "upsert");
            const editor = new ProfileEditor(module, false, mockProfile);
            editor.next = vi.fn();

            await editor.editContact(interaction);

            expect(upsertSpy).toHaveBeenCalledOnce();
            expect(upsertSpy).toHaveBeenCalledWith(mockUser.id, {
                contact: "Send me a direct message!",
                creationStatus: ProfileCreationStatus.Banner
            });
        });

        it("should go to the next step if the profile got updated successfully", async () => {
            const data = createMockModalSubmitInteraction({
                components: [{
                    components: [{
                        custom_id: "contact",
                        type: ComponentType.TextInput,
                        value: "Send me a direct message!"
                    }],
                    type: ComponentType.ActionRow
                }],
                custom_id: `${Date.now()}_create_profile_3`
            });

            const response = new ModalSubmitInteraction(data, module.client, vi.fn());
            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(response);

            const upsertSpy = vi.spyOn(module.profiles, "upsert");
            const editor = new ProfileEditor(module, false, mockProfile);
            editor.next = vi.fn();

            await editor.editContact(interaction);

            expect(upsertSpy).toHaveBeenCalledOnce();
            expect(upsertSpy).toHaveBeenCalledWith(mockUser.id, {
                contact: "Send me a direct message!",
                creationStatus: ProfileCreationStatus.Banner
            });
            expect(editor.next).toHaveBeenCalledOnce();
            expect(editor.next).toHaveBeenCalledWith(response);
        });

        it("should set the contact method to 'null' if left empty", async () => {
            const data = createMockModalSubmitInteraction({
                components: [{
                    components: [{
                        custom_id: "contact",
                        type: ComponentType.TextInput,
                        value: ""
                    }],
                    type: ComponentType.ActionRow
                }],
                custom_id: `${Date.now()}_create_profile_3`
            });

            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(
                new ModalSubmitInteraction(data, module.client, vi.fn())
            );

            const upsertSpy = vi.spyOn(module.profiles, "upsert");
            const editor = new ProfileEditor(module, false, mockProfile);
            editor.next = vi.fn();

            await editor.editContact(interaction);

            expect(upsertSpy).toHaveBeenCalledOnce();
            expect(upsertSpy).toHaveBeenCalledWith(mockUser.id, {
                contact: null,
                creationStatus: ProfileCreationStatus.Banner
            });
        });

        it("should show a timeout message if the user did not respond", async () => {
            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(undefined);

            const editSpy = vi.spyOn(interaction, "editParent");
            const upsertSpy = vi.spyOn(module.profiles, "upsert");
            const editor = new ProfileEditor(module, false, mockProfile);

            await editor.editContact(interaction);

            expect(upsertSpy).not.toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith(timeoutContent);
        });

        it("should show an error if the contact method contains an invite link", async () => {
            const data = createMockModalSubmitInteraction({
                components: [{
                    components: [{
                        custom_id: "contact",
                        type: ComponentType.TextInput,
                        value: "discord.gg/invite"
                    }],
                    type: ComponentType.ActionRow
                }],
                custom_id: `${Date.now()}_create_profile_3`
            });

            const response = new ModalSubmitInteraction(data, module.client, vi.fn());
            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(response);

            const createSpy = vi.spyOn(response, "createMessage");
            const upsertSpy = vi.spyOn(module.profiles, "upsert");
            const editor = new ProfileEditor(module, false, mockProfile);

            await editor.editContact(interaction);

            expect(upsertSpy).not.toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("Your profile may not contain invite links."),
                flags: MessageFlags.Ephemeral
            });
        });
    });

    describe("editProfile", () => {
        it("should update the profile with the correct data if the interaction is valid", async () => {
            const data = createMockModalSubmitInteraction({
                components: [
                    {
                        components: [{
                            custom_id: "about",
                            type: ComponentType.TextInput,
                            value: "Hello world!"
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "skills",
                            type: ComponentType.TextInput,
                            value: "Logo Design, Icon Design, Poster Design"
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "location",
                            type: ComponentType.TextInput,
                            value: "San Francisco, CA"
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "pricing",
                            type: ComponentType.TextInput,
                            value: "Starting from $100"
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "links",
                            type: ComponentType.TextInput,
                            value: "https://example.com/\nhttps://github.com/HeadTriXz"
                        }],
                        type: ComponentType.ActionRow
                    }
                ],
                custom_id: `${Date.now()}_create_profile_1`
            });

            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(
                new ModalSubmitInteraction(data, module.client, vi.fn())
            );

            const upsertSpy = vi.spyOn(module.profiles, "upsert");
            const editor = new ProfileEditor(module, true, mockProfile);
            editor.next = vi.fn();

            await editor.editProfile(interaction);

            expect(upsertSpy).toHaveBeenCalledOnce();
            expect(upsertSpy).toHaveBeenCalledWith(mockUser.id, {
                about: "Hello world!",
                links: ["https://example.com/", "https://github.com/HeadTriXz"],
                location: "San Francisco, CA",
                pricing: "Starting from $100",
                skills: ["Logo Design", "Icon Design", "Poster Design"]
            });
        });

        it("should update the creation status if the user is creating a new profile", async () => {
            const data = createMockModalSubmitInteraction({
                components: [
                    {
                        components: [{
                            custom_id: "about",
                            type: ComponentType.TextInput,
                            value: "Hello world!"
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "skills",
                            type: ComponentType.TextInput,
                            value: "Logo Design, Icon Design, Poster Design"
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "location",
                            type: ComponentType.TextInput,
                            value: "San Francisco, CA"
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "pricing",
                            type: ComponentType.TextInput,
                            value: "Starting from $100"
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "links",
                            type: ComponentType.TextInput,
                            value: "https://example.com/\nhttps://github.com/HeadTriXz"
                        }],
                        type: ComponentType.ActionRow
                    }
                ],
                custom_id: `${Date.now()}_create_profile_1`
            });

            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(
                new ModalSubmitInteraction(data, module.client, vi.fn())
            );

            const upsertSpy = vi.spyOn(module.profiles, "upsert");
            const editor = new ProfileEditor(module, false, mockProfile);
            editor.next = vi.fn();

            await editor.editProfile(interaction);

            expect(upsertSpy).toHaveBeenCalledOnce();
            expect(upsertSpy).toHaveBeenCalledWith(mockUser.id, {
                about: "Hello world!",
                creationStatus: ProfileCreationStatus.Availability,
                links: ["https://example.com/", "https://github.com/HeadTriXz"],
                location: "San Francisco, CA",
                pricing: "Starting from $100",
                skills: ["Logo Design", "Icon Design", "Poster Design"]
            });
        });

        it("should go to the next step if the profile got updated successfully", async () => {
            const data = createMockModalSubmitInteraction({
                components: [
                    {
                        components: [{
                            custom_id: "about",
                            type: ComponentType.TextInput,
                            value: "Hello world!"
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "skills",
                            type: ComponentType.TextInput,
                            value: "Logo Design, Icon Design, Poster Design"
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "location",
                            type: ComponentType.TextInput,
                            value: "San Francisco, CA"
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "pricing",
                            type: ComponentType.TextInput,
                            value: "Starting from $100"
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "links",
                            type: ComponentType.TextInput,
                            value: "https://example.com/\nhttps://github.com/HeadTriXz"
                        }],
                        type: ComponentType.ActionRow
                    }
                ],
                custom_id: `${Date.now()}_create_profile_1`
            });

            const response = new ModalSubmitInteraction(data, module.client, vi.fn());
            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(response);

            const upsertSpy = vi.spyOn(module.profiles, "upsert");
            const editor = new ProfileEditor(module, false, mockProfile);
            editor.next = vi.fn();

            await editor.editProfile(interaction);

            expect(upsertSpy).toHaveBeenCalledOnce();
            expect(upsertSpy).toHaveBeenCalledWith(mockUser.id, {
                about: "Hello world!",
                creationStatus: ProfileCreationStatus.Availability,
                links: ["https://example.com/", "https://github.com/HeadTriXz"],
                location: "San Francisco, CA",
                pricing: "Starting from $100",
                skills: ["Logo Design", "Icon Design", "Poster Design"]
            });
            expect(editor.next).toHaveBeenCalledOnce();
            expect(editor.next).toHaveBeenCalledWith(response);
        });

        it("should update the profile with the correct data without optional fields", async () => {
            const data = createMockModalSubmitInteraction({
                components: [
                    {
                        components: [{
                            custom_id: "about",
                            type: ComponentType.TextInput,
                            value: "Hello world!"
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "skills",
                            type: ComponentType.TextInput,
                            value: ""
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "location",
                            type: ComponentType.TextInput,
                            value: ""
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "pricing",
                            type: ComponentType.TextInput,
                            value: ""
                        }],
                        type: ComponentType.ActionRow
                    },
                    {
                        components: [{
                            custom_id: "links",
                            type: ComponentType.TextInput,
                            value: ""
                        }],
                        type: ComponentType.ActionRow
                    }
                ],
                custom_id: `${Date.now()}_create_profile_1`
            });

            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(
                new ModalSubmitInteraction(data, module.client, vi.fn())
            );

            const upsertSpy = vi.spyOn(module.profiles, "upsert");
            const editor = new ProfileEditor(module, false, mockProfile);
            editor.next = vi.fn();

            await editor.editProfile(interaction);

            expect(upsertSpy).toHaveBeenCalledOnce();
            expect(upsertSpy).toHaveBeenCalledWith(mockUser.id, {
                about: "Hello world!",
                creationStatus: ProfileCreationStatus.Availability,
                links: [],
                location: null,
                pricing: null,
                skills: []
            });
        });

        it("should show a timeout message if the user did not respond", async () => {
            vi.spyOn(interaction, "awaitModalSubmit").mockResolvedValue(undefined);

            const editSpy = vi.spyOn(interaction, "editParent");
            const upsertSpy = vi.spyOn(module.profiles, "upsert");
            const editor = new ProfileEditor(module, false, mockProfile);

            await editor.editProfile(interaction);

            expect(upsertSpy).not.toHaveBeenCalled();
            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith(timeoutContent);
        });
    });

    describe("next", () => {
        it("should show the preview if they are editing their profile", async () => {
            const editor = new ProfileEditor(module, true, mockProfile);
            editor.showPreview = vi.fn();

            await editor.next(interaction);

            expect(editor.showPreview).toHaveBeenCalledOnce();
            expect(editor.showPreview).toHaveBeenCalledWith(interaction);
        });

        it("should edit the profile if the creation status is set to 'Profile'", async () => {
            const profile = { ...mockProfile, creationStatus: ProfileCreationStatus.Profile };
            const editor = new ProfileEditor(module, false, profile);
            editor.editProfile = vi.fn();

            await editor.next(interaction);

            expect(editor.editProfile).toHaveBeenCalledOnce();
            expect(editor.editProfile).toHaveBeenCalledWith(interaction);
        });

        it("should edit the availability if the creation status is set to 'Availability'", async () => {
            const profile = { ...mockProfile, creationStatus: ProfileCreationStatus.Availability };
            const editor = new ProfileEditor(module, false, profile);
            editor.editAvailability = vi.fn();

            await editor.next(interaction);

            expect(editor.editAvailability).toHaveBeenCalledOnce();
            expect(editor.editAvailability).toHaveBeenCalledWith(interaction);
        });

        it("should edit the contact information if the creation status is set to 'Contact'", async () => {
            const profile = { ...mockProfile, creationStatus: ProfileCreationStatus.Contact };
            const editor = new ProfileEditor(module, false, profile);
            editor.editContact = vi.fn();

            await editor.next(interaction);

            expect(editor.editContact).toHaveBeenCalledOnce();
            expect(editor.editContact).toHaveBeenCalledWith(interaction);
        });

        it("should edit the banner if the creation status is set to 'Banner'", async () => {
            const profile = { ...mockProfile, creationStatus: ProfileCreationStatus.Banner };
            const editor = new ProfileEditor(module, false, profile);
            editor.promptBanner = vi.fn();

            await editor.next(interaction);

            expect(editor.promptBanner).toHaveBeenCalledOnce();
            expect(editor.promptBanner).toHaveBeenCalledWith(interaction);
        });

        it("should show the preview if the creation status is set to 'Preview'", async () => {
            const profile = { ...mockProfile, creationStatus: ProfileCreationStatus.Preview };
            const editor = new ProfileEditor(module, false, profile);
            editor.showPreview = vi.fn();

            await editor.next(interaction);

            expect(editor.showPreview).toHaveBeenCalledOnce();
            expect(editor.showPreview).toHaveBeenCalledWith(interaction);
        });

        it("should start creating a profile if no profile exists yet", async () => {
            const editor = new ProfileEditor(module, false);
            editor.editProfile = vi.fn();

            await editor.next(interaction);

            expect(editor.editProfile).toHaveBeenCalledOnce();
            expect(editor.editProfile).toHaveBeenCalledWith(interaction);
        });
    });

    describe("promptBanner", () => {
        it("should start editing the banner if the user presses 'Yes'", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "yes"
            });

            const response = new MessageComponentInteraction(data, module.client, vi.fn());
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);

            const editor = new ProfileEditor(module, false, mockProfile);
            editor.editBanner = vi.fn();

            await editor.promptBanner(interaction);

            expect(editor.editBanner).toHaveBeenCalledOnce();
            expect(editor.editBanner).toHaveBeenCalledWith(response, mockChannel.id, true);
        });

        it("should continue to the preview if the user presses 'No'", async () => {
            const data = createMockMessageComponentInteraction({
                component_type: ComponentType.Button,
                custom_id: "no"
            });

            const response = new MessageComponentInteraction(data, module.client, vi.fn());
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);

            const upsertSpy = vi.spyOn(module.profiles, "upsert");
            const editor = new ProfileEditor(module, false, mockProfile);
            editor.showPreview = vi.fn();

            await editor.promptBanner(interaction);

            expect(editor.showPreview).toHaveBeenCalledOnce();
            expect(editor.showPreview).toHaveBeenCalledWith(response);
            expect(upsertSpy).toHaveBeenCalledOnce();
            expect(upsertSpy).toHaveBeenCalledWith(mockUser.id, {
                creationStatus: ProfileCreationStatus.Preview
            });
        });

        it("should show a timeout message if the user did not respond", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

            const editSpy = vi.spyOn(interaction, "editParent");
            const upsertSpy = vi.spyOn(module.profiles, "upsert");
            const editor = new ProfileEditor(module, false, mockProfile);

            await editor.promptBanner(interaction);

            expect(upsertSpy).not.toHaveBeenCalled();
            expect(editSpy).toHaveBeenCalledTimes(2);
            expect(editSpy).toHaveBeenCalledWith(timeoutContent);
        });
    });

    describe("showPreview", () => {
        it("should show the preview of the profile", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

            const editSpy = vi.spyOn(interaction, "editOriginalMessage");
            const editor = new ProfileEditor(module, false, mockProfile);

            await editor.showPreview(interaction);

            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith({
                components: expect.any(Array),
                content: "### Here's a preview of your profile:\n"
                    + "Choose one of the following options:\n"
                    + "- To make changes and edit your profile, press the **Edit Profile** button.\n"
                    + "- To publish your profile, press the **Publish Profile** button.",
                embeds: [{
                    color: expect.any(Number),
                    description: expect.any(String),
                    fields: expect.any(Array),
                    image: {
                        url: mockProfile.bannerURL
                    },
                    thumbnail: {
                        url: expect.any(String)
                    },
                    title: mockUser.global_name
                }]
            });
        });

        it("should create a new message if the preview should be shown in DMs", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

            const createSpy = vi.spyOn(module.client.api.channels, "createMessage");
            const editSpy = vi.spyOn(interaction, "editOriginalMessage");
            const editor = new ProfileEditor(module, false, mockProfile);

            await editor.showPreview(interaction, mockChannel.id);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(editSpy).not.toHaveBeenCalled();
        });

        it("should fetch the user's profile if no profile is loaded yet", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

            const getSpy = vi.spyOn(module.profiles, "get").mockResolvedValue(mockProfile);
            const editor = new ProfileEditor(module, false);

            await editor.showPreview(interaction, mockChannel.id);

            expect(getSpy).toHaveBeenCalledOnce();
        });

        it("should show an error message if the profile does not exist", async () => {
            vi.spyOn(module.profiles, "get").mockResolvedValue(null);

            const createSpy = vi.spyOn(interaction, "createMessage");
            const editor = new ProfileEditor(module, false);

            await editor.showPreview(interaction, mockChannel.id);

            expect(createSpy).toHaveBeenCalledOnce();
            expect(createSpy).toHaveBeenCalledWith({
                content: expect.stringContaining("I don't have access to that profile."),
                flags: MessageFlags.Ephemeral
            });
        });
    });

    describe("#awaitPreviewResponse", () => {
        it("should show a timeout message if the user did not respond", async () => {
            vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(undefined);

            const editSpy = vi.spyOn(interaction, "editParent");
            const editor = new ProfileEditor(module, false, mockProfile);

            await editor.showPreview(interaction, mockChannel.id);

            expect(editSpy).toHaveBeenCalledOnce();
            expect(editSpy).toHaveBeenCalledWith(timeoutContent);
        });

        describe("Publish", () => {
            let settings: ProfilesSettings;

            beforeEach(() => {
                settings = {
                    channelID: mockChannel.id,
                    enabled: true,
                    guildID: "68239102456844360",
                    lastMessageID: null
                };

                vi.spyOn(module.profilesSettings, "get").mockResolvedValue(settings);
            });

            it("should post the profile if the user is creating a new profile", async () => {
                const data = createMockMessageComponentInteraction({
                    component_type: ComponentType.Button,
                    custom_id: "publish"
                });

                vi.spyOn(module.profiles, "upsert").mockResolvedValue(mockProfile);
                vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(
                    new MessageComponentInteraction(data, module.client, vi.fn())
                );

                const editor = new ProfileEditor(module, false, mockProfile);
                module.postProfile = vi.fn();

                await editor.showPreview(interaction);

                expect(module.postProfile).toHaveBeenCalledOnce();
                expect(module.postProfile).toHaveBeenCalledWith(mockUser, mockProfile, settings);
            });

            it("should edit the latest profile message if the user is editing their profile", async () => {
                const data = createMockMessageComponentInteraction({
                    component_type: ComponentType.Button,
                    custom_id: "publish"
                });

                vi.spyOn(module.profileMessages, "getLatest").mockResolvedValue({
                    guildID: "68239102456844360",
                    messageID: mockMessage.id,
                    userID: mockUser.id
                });
                vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(
                    new MessageComponentInteraction(data, module.client, vi.fn())
                );

                const editSpy = vi.spyOn(module.client.api.channels, "editMessage");
                const editor = new ProfileEditor(module, true, mockProfile);

                await editor.showPreview(interaction);

                expect(editSpy).toHaveBeenCalledOnce();
                expect(editSpy).toHaveBeenCalledWith(mockChannel.id, mockMessage.id, expect.any(Object));
            });

            it("should post the profile if the user is editing their profile and has no existing profile messages", async () => {
                const data = createMockMessageComponentInteraction({
                    component_type: ComponentType.Button,
                    custom_id: "publish"
                });

                vi.spyOn(module.profileMessages, "getLatest").mockResolvedValue(null);
                vi.spyOn(module.profiles, "upsert").mockResolvedValue(mockProfile);
                vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(
                    new MessageComponentInteraction(data, module.client, vi.fn())
                );

                const editor = new ProfileEditor(module, true, mockProfile);
                module.postProfile = vi.fn();

                await editor.showPreview(interaction);

                expect(module.postProfile).toHaveBeenCalledOnce();
                expect(module.postProfile).toHaveBeenCalledWith(mockUser, mockProfile, settings);
            });

            it("should show an error message if the profiles are disabled in the guild", async () => {
                const data = createMockMessageComponentInteraction({
                    component_type: ComponentType.Button,
                    custom_id: "publish"
                });

                vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(
                    new MessageComponentInteraction(data, module.client, vi.fn())
                );

                const createSpy = vi.spyOn(interaction, "createMessage");
                const editor = new ProfileEditor(module, true, mockProfile);
                settings.enabled = false;

                await editor.showPreview(interaction);

                expect(createSpy).toHaveBeenCalledOnce();
                expect(createSpy).toHaveBeenCalledWith({
                    content: expect.stringContaining("Profiles are currently disabled for this guild."),
                    flags: MessageFlags.Ephemeral
                });
            });

            it("should show an error message if the guild has not set a channel for profiles", async () => {
                const data = createMockMessageComponentInteraction({
                    component_type: ComponentType.Button,
                    custom_id: "publish"
                });

                vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(
                    new MessageComponentInteraction(data, module.client, vi.fn())
                );

                const createSpy = vi.spyOn(interaction, "createMessage");
                const editor = new ProfileEditor(module, true, mockProfile);
                settings.channelID = null;

                await editor.showPreview(interaction);

                expect(createSpy).toHaveBeenCalledOnce();
                expect(createSpy).toHaveBeenCalledWith({
                    content: expect.stringContaining("This guild hasn't setup their channel for profiles."),
                    flags: MessageFlags.Ephemeral
                });
            });

            it("should handle errors on editing the latest profile message", async () => {
                const data = createMockMessageComponentInteraction({
                    component_type: ComponentType.Button,
                    custom_id: "publish"
                });

                vi.spyOn(module.client.api.channels, "editMessage").mockRejectedValue(new Error());
                vi.spyOn(module.profileMessages, "getLatest").mockResolvedValue({
                    guildID: "68239102456844360",
                    messageID: mockMessage.id,
                    userID: mockUser.id
                });
                vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(
                    new MessageComponentInteraction(data, module.client, vi.fn())
                );

                const loggerSpy = vi.spyOn(module.client.logger, "warn");
                const editor = new ProfileEditor(module, true, mockProfile);

                await editor.showPreview(interaction);

                expect(loggerSpy).toHaveBeenCalledOnce();
                expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining("Could not edit last message"));
            });

            it("should ignore if the ID of the guild is unknown", async () => {
                const data = createMockMessageComponentInteraction({
                    component_type: ComponentType.Button,
                    custom_id: "publish"
                });

                vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(
                    new MessageComponentInteraction(data, module.client, vi.fn())
                );

                const editor = new ProfileEditor(module, true, mockProfile);
                interaction.guildID = undefined;
                module.postProfile = vi.fn();

                await editor.showPreview(interaction);

                expect(module.postProfile).not.toHaveBeenCalled();
            });
        });

        describe("Edit", () => {
            it("should set the 'isEditing' property to true", async () => {
                const data = createMockMessageComponentInteraction({
                    component_type: ComponentType.Button,
                    custom_id: "edit"
                });

                const response = new MessageComponentInteraction(data, module.client, vi.fn());
                vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
                vi.spyOn(response, "awaitMessageComponent").mockResolvedValue(undefined);
                vi.spyOn(response, "editOriginalMessage").mockResolvedValue(mockMessage);

                const editor = new ProfileEditor(module, false, mockProfile);
                await editor.showPreview(interaction);

                expect(editor.isEditing).toBe(true);
            });

            it("should show a timeout message if the user did not respond", async () => {
                const data = createMockMessageComponentInteraction({
                    component_type: ComponentType.Button,
                    custom_id: "edit"
                });

                const response = new MessageComponentInteraction(data, module.client, vi.fn());
                const editSpy = vi.spyOn(response, "editParent");

                vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
                vi.spyOn(response, "awaitMessageComponent").mockResolvedValue(undefined);
                vi.spyOn(response, "editOriginalMessage").mockResolvedValue(mockMessage);

                const editor = new ProfileEditor(module, false, mockProfile);
                await editor.showPreview(interaction);

                expect(editSpy).toHaveBeenCalledTimes(2);
                expect(editSpy).toHaveBeenCalledWith(timeoutContent);
            });

            it("should edit the availability if the user selected 'Availability'", async () => {
                const data = createMockMessageComponentInteraction({
                    component_type: ComponentType.Button,
                    custom_id: "edit"
                });

                const editData = createMockMessageComponentInteraction({
                    component_type: ComponentType.StringSelect,
                    custom_id: "preview_profile_edit",
                    values: ["availability"]
                });

                const editResponse = new MessageComponentInteraction(editData, module.client, vi.fn());
                const response = new MessageComponentInteraction(data, module.client, vi.fn());

                vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
                vi.spyOn(response, "awaitMessageComponent").mockResolvedValue(editResponse);
                vi.spyOn(response, "editOriginalMessage").mockResolvedValue(mockMessage);

                const editor = new ProfileEditor(module, false, mockProfile);
                editor.editAvailability = vi.fn();

                await editor.showPreview(interaction);

                expect(editor.editAvailability).toHaveBeenCalledOnce();
                expect(editor.editAvailability).toHaveBeenCalledWith(editResponse);
            });

            it("should edit the banner if the user selected 'Banner'", async () => {
                const data = createMockMessageComponentInteraction({
                    component_type: ComponentType.Button,
                    custom_id: "edit"
                });

                const editData = createMockMessageComponentInteraction({
                    component_type: ComponentType.StringSelect,
                    custom_id: "preview_profile_edit",
                    values: ["banner"]
                });

                const editResponse = new MessageComponentInteraction(editData, module.client, vi.fn());
                const response = new MessageComponentInteraction(data, module.client, vi.fn());

                vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
                vi.spyOn(response, "awaitMessageComponent").mockResolvedValue(editResponse);
                vi.spyOn(response, "editOriginalMessage").mockResolvedValue(mockMessage);

                const editor = new ProfileEditor(module, false, mockProfile);
                editor.editBanner = vi.fn();

                await editor.showPreview(interaction);

                expect(editor.editBanner).toHaveBeenCalledOnce();
                expect(editor.editBanner).toHaveBeenCalledWith(editResponse, mockChannel.id, true);
            });

            it("should edit the contact information if the user selected 'Contact'", async () => {
                const data = createMockMessageComponentInteraction({
                    component_type: ComponentType.Button,
                    custom_id: "edit"
                });

                const editData = createMockMessageComponentInteraction({
                    component_type: ComponentType.StringSelect,
                    custom_id: "preview_profile_edit",
                    values: ["contact"]
                });

                const editResponse = new MessageComponentInteraction(editData, module.client, vi.fn());
                const response = new MessageComponentInteraction(data, module.client, vi.fn());

                vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
                vi.spyOn(response, "awaitMessageComponent").mockResolvedValue(editResponse);
                vi.spyOn(response, "editOriginalMessage").mockResolvedValue(mockMessage);

                const editor = new ProfileEditor(module, false, mockProfile);
                editor.editContact = vi.fn();

                await editor.showPreview(interaction);

                expect(editor.editContact).toHaveBeenCalledOnce();
                expect(editor.editContact).toHaveBeenCalledWith(editResponse);
            });

            it("should edit the profile if the user selected 'Profile'", async () => {
                const data = createMockMessageComponentInteraction({
                    component_type: ComponentType.Button,
                    custom_id: "edit"
                });

                const editData = createMockMessageComponentInteraction({
                    component_type: ComponentType.StringSelect,
                    custom_id: "preview_profile_edit",
                    values: ["profile"]
                });

                const editResponse = new MessageComponentInteraction(editData, module.client, vi.fn());
                const response = new MessageComponentInteraction(data, module.client, vi.fn());

                vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
                vi.spyOn(response, "awaitMessageComponent").mockResolvedValue(editResponse);
                vi.spyOn(response, "editOriginalMessage").mockResolvedValue(mockMessage);

                const editor = new ProfileEditor(module, false, mockProfile);
                editor.editProfile = vi.fn();

                await editor.showPreview(interaction);

                expect(editor.editProfile).toHaveBeenCalledOnce();
                expect(editor.editProfile).toHaveBeenCalledWith(editResponse);
            });

            it("should not fetch the DM channel if the ID is already known", async () => {
                const data = createMockMessageComponentInteraction({
                    component_type: ComponentType.Button,
                    custom_id: "edit"
                });

                const editData = createMockMessageComponentInteraction({
                    component_type: ComponentType.StringSelect,
                    custom_id: "preview_profile_edit",
                    values: ["banner"]
                });

                const editResponse = new MessageComponentInteraction(editData, module.client, vi.fn());
                const response = new MessageComponentInteraction(data, module.client, vi.fn());
                const dmSpy = vi.spyOn(module.client.api.users, "createDM");

                vi.spyOn(interaction, "awaitMessageComponent").mockResolvedValue(response);
                vi.spyOn(response, "awaitMessageComponent").mockResolvedValue(editResponse);
                vi.spyOn(response, "editOriginalMessage").mockResolvedValue(mockMessage);

                const editor = new ProfileEditor(module, false, mockProfile);
                editor.editBanner = vi.fn();

                await editor.showPreview(interaction, mockChannel.id);

                expect(dmSpy).not.toHaveBeenCalled();
            });
        });

        describe("Contact", () => {
            it("should display the contact information", async () => {
                const data = createMockMessageComponentInteraction({
                    component_type: ComponentType.Button,
                    custom_id: "contact"
                });

                const response = new MessageComponentInteraction(data, module.client, vi.fn());

                vi.spyOn(interaction, "awaitMessageComponent")
                    .mockResolvedValueOnce(response)
                    .mockResolvedValue(undefined);
                vi.spyOn(response, "editOriginalMessage").mockResolvedValue(mockMessage);

                const editor = new ProfileEditor(module, false, mockProfile);
                const displaySpy = vi.spyOn(utils, "displayContact").mockResolvedValue();

                await editor.showPreview(interaction);

                expect(displaySpy).toHaveBeenCalledOnce();
                expect(displaySpy).toHaveBeenCalledWith(interaction, mockProfile);
            });

            it("should continue listening for interactions on the preview", async () => {
                const data = createMockMessageComponentInteraction({
                    component_type: ComponentType.Button,
                    custom_id: "contact"
                });

                vi.spyOn(interaction, "awaitMessageComponent")
                    .mockResolvedValueOnce(new MessageComponentInteraction(data, module.client, vi.fn()))
                    .mockResolvedValueOnce(new MessageComponentInteraction(data, module.client, vi.fn()))
                    .mockResolvedValue(undefined);

                const editor = new ProfileEditor(module, false, mockProfile);
                const displaySpy = vi.spyOn(utils, "displayContact").mockResolvedValue();

                await editor.showPreview(interaction);

                expect(displaySpy).toHaveBeenCalledTimes(2);
                expect(displaySpy).toHaveBeenCalledWith(interaction, mockProfile);
            });
        });
    });
});
