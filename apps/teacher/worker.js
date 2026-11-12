/*
 * 静的アセットに無いURLだけを受け持つ（wrangler.jsonc。アセットにあるURLは、このコードを通らずにそのまま返る）
 * - 画面のURL（/tutorials/1など）にはindex.htmlを返し、画面側のルーティングに任せる
 * - /assets/の下は404を返す。デプロイで消えた古いファイルにindex.htmlを返すと、_headersの長期キャッシュが付いて端末に残るため
 */
export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		if (url.pathname.startsWith("/assets/")) return new Response("Not Found", { status: 404 });
		return env.ASSETS.fetch(new URL("/", url));
	},
};
