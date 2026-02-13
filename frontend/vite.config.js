var _a;
/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
var proxyTarget = (_a = process.env.VITE_PROXY_TARGET) !== null && _a !== void 0 ? _a : "http://localhost:8000";
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
            "@": path.resolve(__dirname, "./src"),
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
        },
    },
});
