import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./src/mocks/setup.ts"],
    globals: true,
  },
});
