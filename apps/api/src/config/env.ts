import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

/*
 * 末尾の/などが付いていても、ブラウザーが送るOriginヘッダーの形（https://example.com）にそろえる
 * CORSは許可するオリジンを文字列の一致で比べるので、環境変数の書き方の違いで本番だけつながらなくなるのを防ぐ
 */
// http・https以外（mailto:など）はオリジンが"null"になり、CORSの許可リストに入ってしまうので通さない
const origin = z.url({ protocol: /^https?$/ }).transform((url) => new URL(url).origin);

export const env = createEnv({
	server: {
		DATABASE_URL: z.url(),
		TEACHER_ORIGIN: origin,
		STUDENT_ORIGIN: origin,
		// 待ち受けるポート。Railwayが環境変数で渡す。手元とテストでは渡さないので3000
		PORT: z.coerce.number().int().min(1).max(65535).default(3000),
	},
	runtimeEnv: process.env,
});
