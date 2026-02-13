import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function getEnvVar(key: string): string | undefined {
  // Avoid depending on Node type declarations (process) in TS config.
  const env = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return env?.[key];
}

const proxyTarget = getEnvVar("VITE_PROXY_TARGET") ?? "http://localhost:8000";
const srcDirUrlPath = new URL("./src", import.meta.url).pathname;
const srcDir =
  // On Windows, file URL path can look like "/D:/path..." which breaks path usage.
  srcDirUrlPath.match(/^\/[A-Za-z]:\//) ? srcDirUrlPath.slice(1) : srcDirUrlPath;

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // Only run unit/integration tests with Vitest.
    // Playwright specs live under e2e/ and are executed via `npm run test:e2e`.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**", "**/node_modules/**"],
  },
  resolve: {
    alias: {
      "@": srcDir,
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: proxyTarget,
        changeOrigin: true,
      },
      "/admin": {
        target: proxyTarget,
        changeOrigin: true,
      },
      "/static": {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
});
