import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		tanstackRouter({
			target: "react",
			routesDirectory: "./src/app/routes",
			generatedRouteTree: "./src/routeTree.gen.ts",
			// 現在のルートに必要なコードのみを分割してロードする設定
			autoCodeSplitting: true,
		}),
		react(),
	],
	server: {
		port: 5174,
		strictPort: true,
	},
	// provider: playwright のような設定は現段階で純粋関数のみをテスト対象としているため、追加しない
	test: {
		typecheck: {
			enabled: true,
		},
	},
});
