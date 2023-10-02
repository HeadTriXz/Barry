import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        coverage: {
            all: true,
            exclude: [
                "**/coverage/**",
                "**/dist/**",
                "**/tests/**",
                "**/types/**",
                "**/types.ts"
            ],
            include: ["src"],
            provider: "v8",
            reporter: ["text", "lcov", "cobertura"]
        },
        globals: true,
        passWithNoTests: true
    }
});
