// サーバーからの知らせ（仕様書backend.mdの「サーバーからの知らせ（SSE）」）
import type { StudentStatus } from "./student-status";

// 教師がつないだ直後に送る、全児童の状態
export type SnapshotEvent = { readonly event: "snapshot"; readonly data: StudentStatus[] };

// 児童が参加したとき・プログラムを送ったときに送る、その児童の状態全体（差分ではない）
export type StudentEvent = { readonly event: "student"; readonly data: StudentStatus };

// 授業が終わったときに送る。送った後に接続を閉じる
export type EndedEvent = { readonly event: "ended"; readonly data: null };

// 接続を切られないための空の知らせ。画面では使わない
export type PingEvent = { readonly event: "ping"; readonly data: null };

// 教師用の受け取り口に流す知らせ
export type TeacherServerEvent = SnapshotEvent | StudentEvent | EndedEvent | PingEvent;

// 児童用の受け取り口に流す知らせ。他の児童の状態は含めない
export type StudentServerEvent = EndedEvent | PingEvent;

export const ENDED: EndedEvent = { event: "ended", data: null };
export const PING: PingEvent = { event: "ping", data: null };
