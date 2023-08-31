import { INVITE_REGEX } from "../../../src/modules/marketplace/constants.js";

describe("INVITE_REGEX", () => {
    it("should match valid invite links", () => {
        expect(INVITE_REGEX.test("https://discord.gg/abcdef")).toBe(true);
        expect(INVITE_REGEX.test("https://discord.com/invite/abcdef")).toBe(true);
        expect(INVITE_REGEX.test("https://discordapp.com/invite/abcdef")).toBe(true);
        expect(INVITE_REGEX.test("https://discord.io/abcdef")).toBe(true);
        expect(INVITE_REGEX.test("https://discord.me/abcdef")).toBe(true);
        expect(INVITE_REGEX.test("https://discord.plus/abcdef")).toBe(true);
        expect(INVITE_REGEX.test("https://invite.gg/abcdef")).toBe(true);
        expect(INVITE_REGEX.test("https://invite.ink/abcdef")).toBe(true);

        expect(INVITE_REGEX.test("http://discord.gg/abcdef")).toBe(true);
        expect(INVITE_REGEX.test("discord.gg/abcdef")).toBe(true);
    });

    it("should not match invalid invite links", () => {
        expect(INVITE_REGEX.test("https://discord.gg/")).toBe(false);
        expect(INVITE_REGEX.test("https://discord.com/invite/")).toBe(false);
        expect(INVITE_REGEX.test("https://discordapp.com/invite/")).toBe(false);
        expect(INVITE_REGEX.test("https://discord.io/")).toBe(false);
        expect(INVITE_REGEX.test("https://discord.me/")).toBe(false);
        expect(INVITE_REGEX.test("https://discord.plus/")).toBe(false);
        expect(INVITE_REGEX.test("https://invite.gg/")).toBe(false);
        expect(INVITE_REGEX.test("https://invite.ink/")).toBe(false);

        expect(INVITE_REGEX.test("https://google.com/")).toBe(false);
        expect(INVITE_REGEX.test("https://discord.com/blog")).toBe(false);
        expect(INVITE_REGEX.test("https://headtrixz.dev/")).toBe(false);
    });
});
