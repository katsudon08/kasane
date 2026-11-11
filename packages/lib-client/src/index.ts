import { treaty } from "@elysia/eden";
import type { App } from "@kasane/api";

/*
 * parseDate: false
 * Edenは既定で、日時の形をした文字列をDateに変える。APIの型は文字列のままなので、型と中身が食い違う
 * 名前（児童の名前・迷路の名前）も日時の形なら変わってしまい、画面に文字として描けなくなる
 */
export const createClient = (url: string) => treaty<App>(url, { parseDate: false });

export { canReconnectNow, reconnectDelayMs, sleep, waitUntilReconnectable } from "./reconnect";
