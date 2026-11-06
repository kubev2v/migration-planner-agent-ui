import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig((_env) => {
  return {
    plugins: [react()],
    server: {
      proxy: {
        // Standalone RVTools Analyzer: OpenAPI base path `/api/v1` (served under `/agent` in dev)
        "/agent/api/v1": {
          target: process.env.VITE_API_BASE_URL || "http://localhost:8000",
          changeOrigin: true,
          rewrite: (path): string => path.replace(/^\/agent/, ""),
        },
      },
    },
  };
});
