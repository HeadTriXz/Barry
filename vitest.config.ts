import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        coverage: {
            all: true,
            include: ["src"],
            provider: "v8",
            reporter: ["text", "lcov", "cobertura"]
        },
        passWithNoTests: true
    }
});
