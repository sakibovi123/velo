import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [preact()],
  // Treat .js files containing JSX (like src/index.js) as JSX in dev too.
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.[jt]sx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { ".js": "jsx" },
    },
  },
  build: {
    // Emit directly into the marketing site's public/ so it can be served
    // at /widget.js for embedding via <script src="/widget.js">.
    outDir: path.resolve(here, "../landing-next/public"),
    emptyOutDir: false,
    lib: {
      entry: "src/index.jsx",
      name: "VeloWidget",
      formats: ["iife"],
      fileName: () => "widget.js",
    },
    rollupOptions: {
      external: [],
      output: {
        inlineDynamicImports: true,
      },
    },
    minify: "terser",
    cssCodeSplit: false,
    assetsInlineLimit: Infinity,
  },
});
