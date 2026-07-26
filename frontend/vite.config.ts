import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// En developpement, on proxifie /api vers le backend FastAPI.
const apiProxyTarget =
  process.env.VITE_DEPLOY_TARGET === "platform"
    ? "http://localhost:8001"
    : "http://localhost:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    open: "/#/manager",
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
});
