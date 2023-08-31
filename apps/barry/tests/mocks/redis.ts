import type { Redis } from "ioredis";
import { mockDeep, mockReset } from "vitest-mock-extended";

beforeEach(() => {
    mockReset(redis);
});

export const redis = mockDeep<Redis>();
