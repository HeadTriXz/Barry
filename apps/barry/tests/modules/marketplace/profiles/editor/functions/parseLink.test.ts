import { describe, expect, test } from "vitest";
import { parseLink } from "../../../../../../src/modules/marketplace/dependencies/profiles/editor/functions/parseLink.js";

describe("parseLink", () => {
    test.each([
        { url: "https://www.behance.net/username", platform: "Behance", username: "username" },
        { url: "http://dribbble.com/user123", platform: "Dribbble", username: "user123" },
        { url: "https://www.linkedin.com/in/johndoe", platform: "LinkedIn", username: "johndoe" },
        { url: "http://www.twitter.com/twitter_user", platform: "Twitter", username: "twitter_user" },
        { url: "https://instagram.com/insta_user", platform: "Instagram", username: "insta_user" },
        { url: "https://github.com/github_user", platform: "GitHub", username: "github_user" },
        { url: "https://www.mywebsite.com", platform: "Website", username: "www.mywebsite.com" }
    ])("should parse $platform links correctly", ({ url, platform, username }) => {
        const link = parseLink(url);

        expect(link.platform).toBe(platform);
        expect(link.username).toBe(username);
    });
});
