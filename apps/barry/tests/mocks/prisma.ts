import type { PrismaClient } from "@prisma/client";
import { mockDeep, mockReset } from "vitest-mock-extended";

import { beforeEach } from "vitest";

beforeEach(() => {
    mockReset(prisma);
});

export const prisma = mockDeep<PrismaClient>();
