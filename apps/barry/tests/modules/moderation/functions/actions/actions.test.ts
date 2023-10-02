import { type APIMessageComponentInteraction, MessageFlags } from "@discordjs/core";
import type { Application } from "../../../../../src/Application.js";

import { ModerationActions, respond } from "../../../../../src/modules/moderation/functions/actions/actions.js";
import { UpdatableInteraction, ReplyableInteraction } from "@barry/core";
import { createMockApplication } from "../../../../mocks/application.js";
import { createMockMessageComponentInteraction } from "@barry/testing";
import ModerationModule from "../../../../../src/modules/moderation/index.js";

describe("respond", () => {
    let client: Application;
    let data: APIMessageComponentInteraction;

    beforeEach(() => {
        client = createMockApplication();
        data = createMockMessageComponentInteraction();
    });

    it("should edit the parent if the interaction is updatable", async () => {
        const interaction = new UpdatableInteraction(data, client, vi.fn());
        const editParentSpy = vi.spyOn(interaction, "editParent");

        await respond(interaction, "content");

        expect(editParentSpy).toHaveBeenCalledWith({ content: "content" });
    });

    it("should create a message if the interaction is not updatable", async () => {
        const interaction = new ReplyableInteraction(data, client, vi.fn());
        const createMessageSpy = vi.spyOn(interaction, "createMessage");

        await respond(interaction, "content");

        expect(createMessageSpy).toHaveBeenCalledWith({
            content: "content",
            flags: MessageFlags.Ephemeral
        });
    });
});

describe("ModerationActions", () => {
    let actions: ModerationActions;

    beforeEach(() => {
        const client = createMockApplication();
        const module = new ModerationModule(client);

        actions = new ModerationActions(module);
    });

    it("should have a ban method", () => {
        expect(actions.ban).toBeInstanceOf(Function);
    });

    it("should have a dwc method", () => {
        expect(actions.dwc).toBeInstanceOf(Function);
    });

    it("should have a kick method", () => {
        expect(actions.kick).toBeInstanceOf(Function);
    });

    it("should have a mute method", () => {
        expect(actions.mute).toBeInstanceOf(Function);
    });

    it("should have a warn method", () => {
        expect(actions.warn).toBeInstanceOf(Function);
    });
});
