import type { PrismaClient } from "@prisma/client";
import { mockDeep, mockReset } from "vitest-mock-extended";

beforeEach(() => {
    mockReset(prisma);
});

export const prisma = mockDeep<PrismaClient>();
