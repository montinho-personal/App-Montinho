import { defineConfig } from "vitest/config";

// Testes de regras puras (volume, memória, relatórios, sincronização, auth).
// Rodam em Node, sem DOM: `npm test`.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
