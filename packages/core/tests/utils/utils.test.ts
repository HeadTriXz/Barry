import {
    getAvatarURL,
    getCreatedAt,
    getDefaultAvatar,
    getDefaultAvatarURL,
    getDiscordEpoch
} from "../../src/index.js";
import { mockUser } from "@barry/testing";

describe("getAvatarURL", () => {
    it("should return the url of the avatar of the user", () => {
        const url = getAvatarURL({ ...mockUser, id: "257522665458237440" });

        expect(url).toBe("https://cdn.discordapp.com/avatars/257522665458237440/9507a0067e219e749e74a678d14b791a.webp");
    });

    it("should return the default avatat url of the user if the user has no avatar", () => {
        const url = getAvatarURL({ ...mockUser, avatar: null, id: "257522665458237440" });

        expect(url).toBe("https://cdn.discordapp.com/embed/avatars/5.png");
    });
});

describe("getCreatedAt", () => {
    it("should return the correct creation timestamp", () => {
        const id = "175928847299117063";
        const timestamp = getCreatedAt(id);

        expect(timestamp).toBe(1462015105796);
    });
});

describe("getDefaultAvatar", () => {
    it("should return the default avatar for a user", () => {
        const avatar1 = getDefaultAvatar({ ...mockUser, id: "257522665458237440" });
        const avatar2 = getDefaultAvatar({ ...mockUser, id: "257522665437265920" });
        const avatar3 = getDefaultAvatar({ ...mockUser, id: "257522665441460225" });

        expect(avatar1).toBe(5);
        expect(avatar2).toBe(0);
        expect(avatar3).toBe(1);
    });

    it("should return the default avatar for a user with a discriminator", () => {
        const avatar1 = getDefaultAvatar({ ...mockUser, discriminator: "1234" });
        const avatar2 = getDefaultAvatar({ ...mockUser, discriminator: "1235" });
        const avatar3 = getDefaultAvatar({ ...mockUser, discriminator: "1236" });

        expect(avatar1).toBe(4);
        expect(avatar2).toBe(0);
        expect(avatar3).toBe(1);
    });
});

describe("getDefaultAvatarURL", () => {
    it("should return the url of the default avatar", () => {
        const url = getDefaultAvatarURL({ ...mockUser, id: "257522665458237440" });

        expect(url).toBe("https://cdn.discordapp.com/embed/avatars/5.png");
    });
});

describe("getDiscordEpoch", () => {
    it("should return the correct epoch timestamp", () => {
        const id = "175928847299117063";
        const timestamp = getDiscordEpoch(id);

        expect(timestamp).toBe(41944705796);
    });
});
