declare module "vite" {
  // Minimal shim for editor/TS when dependencies aren't installed locally.
  // CI/dev environments will use the real types from `vite`.
  export function defineConfig(config: unknown): unknown;
}

declare module "@vitejs/plugin-react" {
  const react: (...args: unknown[]) => unknown;
  export default react;
}

