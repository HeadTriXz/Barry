import { type CooldownManager, MapCooldownManager } from "../../../src/index.js";

describe("MapCooldownManager", () => {
    const key = "cooldown";
    let cooldowns: CooldownManager;

    beforeEach(() => {
        vi.useFakeTimers();
        cooldowns = new MapCooldownManager();
    });

    describe("get", () => {
        it("should return the expiration date of a cooldown", () => {
            const expiresAt = Date.now() + 5000;
            cooldowns.set(key, 5000);

            expect(cooldowns.get(key)).toBe(expiresAt);
        });

        it("should return undefined for an expired cooldown", () => {
            cooldowns.set(key, 5000);

            vi.advanceTimersByTime(6000);

            expect(cooldowns.get(key)).toBeUndefined();
        });

        it("should return undefined for an unknown cooldown", () => {
            expect(cooldowns.get(key)).toBeUndefined();
        });
    });

    describe("has", () => {
        it("should return true for an active cooldown", () => {
            cooldowns.set(key, 5000);

            expect(cooldowns.has(key)).toBe(true);
        });

        it("should return false for an expired cooldown", () => {
            cooldowns.set(key, 5000);

            vi.advanceTimersByTime(6000);

            expect(cooldowns.has(key)).toBe(false);
        });

        it("should return false for an unknown cooldown", () => {
            expect(cooldowns.has(key)).toBe(false);
        });
    });

    describe("remove", () => {
        it("should remove a cooldown", () => {
            cooldowns.set(key, 5000);

            const removed = cooldowns.remove(key);

            expect(removed).toBe(true);
            expect(cooldowns.has(key)).toBe(false);
        });

        it("should return false if there is no cooldown to remove", () => {
            expect(cooldowns.remove(key)).toBe(false);
        });
    });

    describe("set", () => {
        it("should set a new cooldown", () => {
            cooldowns.set(key, 5000);

            const expiresAt = cooldowns.get(key);
            expect(expiresAt).toBeGreaterThan(Date.now());
        });
    });
});
