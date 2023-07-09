import { defineConfig } from "tsup";

export default defineConfig({
    clean: true,
    dts: true,
    entry: ["src/index.ts"],
    format: "esm",
    platform: "node",
    skipNodeModulesBundle: true,
    sourcemap: true,
    splitting: false,
    target: "es2022"
});
