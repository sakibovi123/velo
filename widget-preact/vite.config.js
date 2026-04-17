import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact()],
  build: {
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
