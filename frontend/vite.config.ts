import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// En developpement, on proxifie /api vers le backend FastAPI (port 8000)
// pour rester en same-origin cote navigateur.
export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    open: "/#/manager",
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
});
