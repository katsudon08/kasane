import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      // 現在のルートに必要なコードのみを分割してロードする設定
      autoCodeSplitting: true,
    }),
    react(),
  ],
  server: {
    port: 5173,
    strictPort: true,
  },
});
