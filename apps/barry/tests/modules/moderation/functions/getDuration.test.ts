import { getDuration } from "../../../../src/modules/moderation/functions/getDuration.js";

describe("getDuration", () => {
    it("should parse '1h 30m' to seconds", () => {
        const duration = getDuration("1h 30m");

        expect(duration).toBe(5400);
    });

    it("should parse '1 week, 2 days, 3 hours, 45 minutes' to seconds", () => {
        const duration = getDuration("1 week, 2 days, 3 hours, 45 minutes");

        expect(duration).toBe(791100);
    });

    it("should parse '2w 3d 4h 5m 6s' to seconds", () => {
        const duration = getDuration("2w 3d 4h 5m 6s");

        expect(duration).toBe(1483506);
    });

    it("should parse '2 weeks and 3 seconds' to seconds", () => {
        const duration = getDuration("2 weeks and 3 seconds");

        expect(duration).toBe(1209603);
    });

    it("should parse '1m 30s' to seconds", () => {
        const duration = getDuration("1m 30s");

        expect(duration).toBe(90);
    });
});
