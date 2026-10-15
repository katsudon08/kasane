import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { defineConfig } from "vitest/config";

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
  // provider: playwrite のような設定は現段階で純粋関数のみをテスト対象としているため、追加しない
  test: {
    globals: true,
    typecheck: {
      enabled: true,
    },
  },
});
