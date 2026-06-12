import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig((_env) => {
  return {
    plugins: [react()],
    server: {
      // Avoid ENOSPC when the system inotify watch limit is exhausted (common on
      // Linux with IDE + monorepo). Set VITE_USE_POLLING=false to use native watchers.
      watch: {
        usePolling: process.env.VITE_USE_POLLING !== "false",
      },
      proxy: {
        "/agent/api/v1": {
          target: process.env.VITE_API_BASE_URL || "http://localhost:8000",
          changeOrigin: true,
          rewrite: (path): string => path.replace(/^\/agent/, ""),
        },
      },
    },
  };
});
