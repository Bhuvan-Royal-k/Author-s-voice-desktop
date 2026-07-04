import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",

      srcDir: "src",
      filename: "sw.js",

      // Disable manifest generation to use public/site.webmanifest exactly
      manifest: false,
    }),
  ],
});