import {
  defineConfig,
} from "vite";

import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    host: "localhost",
    port: 5173,
    strictPort: true,
    proxy: {
      "^/auth/(login|callback|session|logout|health)(?:\\?|$)": {
        target:
            "http://127.0.0.1:3000",

        changeOrigin:
            false,
      },
    },
  },
});