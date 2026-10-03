import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: process.env.BASE_PATH || "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "TableQuest",
        short_name: "TableQuest",
        description: "Less scrolling. More together.",
        theme_color: "#111310",
        background_color: "#111310",
        display: "standalone",
        start_url: ".",
        scope: ".",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,json,woff2,webp}"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
    }),
  ],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
});
