import { ProfileAvailability, getEmoji } from "../../../../../src/modules/marketplace/dependencies/profiles/editor/availability.js";
import { describe, expect, it } from "vitest";

describe("Availability", () => {
    describe("getEmoji", () => {
        it("should return the 'unavailable' emote if the user is marked as 'Not available'", () => {
            const emoji = getEmoji(ProfileAvailability.None);

            expect(emoji).toContain(":unavailable:");
        });

        it("should return the 'busy' emote if the user is marked as 'Currently busy'", () => {
            const emoji = getEmoji(ProfileAvailability.CurrentlyBusy | ProfileAvailability.FullTime);

            expect(emoji).toContain(":busy:");
        });

        it("should return the 'available' emote otherwise", () => {
            const emoji = getEmoji(ProfileAvailability.FullTime | ProfileAvailability.RemoteWork);

            expect(emoji).toContain(":check:");
        });
    });
});
