import { treaty } from "@elysiajs/eden";
import type { App } from "@kasane/api";

// apps/api に接続する Eden Treaty クライアントを生成する。url は接続先のオリジン（例: http://localhost:3000）
export const createClient = (url: string) => treaty<App>(url);

export type Client = ReturnType<typeof createClient>;
