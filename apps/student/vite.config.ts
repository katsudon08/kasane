import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { loadEnv, type Plugin } from "vite";
import { defineConfig } from "vitest/config";

// 環境変数の値がオリジン（https://example.comのように末尾の/なし）か。画面はこの値にパスをつなげて使う
function isOrigin(value: string | undefined): value is string {
	return value !== undefined && URL.canParse(value) && new URL(value).origin === value;
}

/*
 * Cloudflareが応答に付けるヘッダー（_headers）を、ビルドの出力に書き出す（仕様書backend.mdの「そのほかのセキュリティ設定」と「性能」）
 * CSPのconnect-srcに入れるAPIのオリジンは環境ごとに違うので、ビルド時の環境変数VITE_API_ORIGINから作る
 */
function cloudflareHeaders(env: Record<string, string>): Plugin {
	return {
		name: "kasane:cloudflare-headers",
		apply: "build",
		generateBundle() {
			const apiOrigin = env.VITE_API_ORIGIN;
			if (!isOrigin(apiOrigin)) {
				this.error(
					"VITE_API_ORIGINを、https://example.comのような末尾に/のないオリジンにしてください",
				);
			}
			const contentSecurityPolicy = [
				"default-src 'self'",
				// QRの読み取り（zxing-wasm）とロボットのモデルの展開（meshopt）がWebAssemblyを使う
				// 'wasm-unsafe-eval'が許すのはWebAssemblyのコンパイルだけで、evalやインラインのスクリプトは許さない
				"script-src 'self' 'wasm-unsafe-eval'",
				`connect-src 'self' ${apiOrigin}`,
				"img-src 'self' blob: data:",
				"font-src 'self'",
				// MantineとReact Three Fiberがstyle属性を使うので、インラインを許すのはスタイルだけにする
				"style-src 'self' 'unsafe-inline'",
				"object-src 'none'",
				"base-uri 'self'",
				"frame-ancestors 'none'",
			].join("; ");
			this.emitFile({
				type: "asset",
				fileName: "_headers",
				source: [
					"/*",
					`  Content-Security-Policy: ${contentSecurityPolicy}`,
					"  X-Content-Type-Options: nosniff",
					"  Referrer-Policy: strict-origin-when-cross-origin",
					"  Permissions-Policy: camera=(self)",
					// ビルドの出力はファイル名にハッシュが付くので、長くキャッシュする
					"/assets/*",
					"  Cache-Control: public, max-age=31536000, immutable",
					"",
				].join("\n"),
			});
		},
	};
}

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, import.meta.dirname, "VITE_");
	return {
		plugins: [
			tanstackRouter({
				target: "react",
				routesDirectory: "./src/app/routes",
				generatedRouteTree: "./src/routeTree.gen.ts",
				// 現在のルートに必要なコードのみを分割してロードする設定
				autoCodeSplitting: true,
			}),
			react(),
			cloudflareHeaders(env),
		],
		server: {
			port: 5173,
			strictPort: true,
		},
		// provider: playwrightのような設定は現段階で純粋関数のみをテスト対象としているため、追加しない
		test: {
			typecheck: {
				enabled: true,
			},
		},
	};
});
