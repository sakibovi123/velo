import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact()],

  build: {
    lib: {
      entry: "src/index.js",
      name: "VeloWidget",
      // Single self-contained IIFE — consumers add one <script> tag
      formats: ["iife"],
      fileName: () => "widget.js",
    },
    rollupOptions: {
      // Everything is bundled in; no external deps for the embed consumer
      external: [],
      output: {
        inlineDynamicImports: true,
      },
    },
    // Minify for production embed
    minify: "terser",
    // Emit a single file with no code-splitting
    cssCodeSplit: false,
    // CSS is handled manually (injected into Shadow DOM), not emitted as a file
    assetsInlineLimit: Infinity,
  },
});
