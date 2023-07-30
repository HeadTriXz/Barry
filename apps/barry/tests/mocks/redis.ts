import type { Redis } from "ioredis";
import { mockDeep, mockReset } from "vitest-mock-extended";

import { beforeEach } from "vitest";

beforeEach(() => {
    mockReset(redis);
});

export const redis = mockDeep<Redis>();
