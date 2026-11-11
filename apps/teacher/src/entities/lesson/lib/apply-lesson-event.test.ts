/*
 * 教師用のSSEで届いた知らせを、児童のIDをキーにしたMapへ入れる
 * （仕様書README.mdの「QRコードを見せる」「進み具合」、backend.mdの「サーバーからの知らせ（SSE）」「再接続」「フロントエンド共通」）
 * - snapshot: 全児童の状態。つなぎ直したときも届くので、Mapを丸ごと置き換える
 * - student: その児童の状態全体。児童のIDで上書きする（差分ではない）
 * - ended・ping: 児童の状態は変わらない（pingは空の知らせ。APIはapps/api/src/presentation/schemas.tsのとおりこの名前で送る）
 */
import { describe, expect, it } from "vitest";

import type { StudentStatus } from "../model/types";
import { applyLessonEvent } from "./apply-lesson-event";

const SORA: StudentStatus = {
	studentId: "00000000-0000-4000-8000-000000000001",
	name: "そらまめ",
	clearedCount: 0,
	lastResult: "notSent",
};
const MAME: StudentStatus = {
	studentId: "00000000-0000-4000-8000-000000000002",
	name: "えだまめ",
	clearedCount: 2,
	lastResult: "failed",
};
const KURO: StudentStatus = {
	studentId: "00000000-0000-4000-8000-000000000003",
	name: "くろまめ",
	clearedCount: 7,
	lastResult: "succeeded",
};

const mapOf = (...students: StudentStatus[]) =>
	new Map(students.map((student) => [student.studentId, student]));

describe("applyLessonEvent", () => {
	it("snapshotは、全児童を届いた順に児童のIDで入れる", () => {
		const students = applyLessonEvent(new Map(), { event: "snapshot", data: [SORA, MAME] });

		expect([...students.entries()]).toEqual([
			[SORA.studentId, SORA],
			[MAME.studentId, MAME],
		]);
	});

	it("snapshotは、前の中身を残さず丸ごと置き換える（つなぎ直したとき）", () => {
		const students = applyLessonEvent(mapOf(SORA, MAME), { event: "snapshot", data: [KURO] });

		expect([...students.values()]).toEqual([KURO]);
	});

	it("児童のいないsnapshotは、空のMapにする", () => {
		const students = applyLessonEvent(mapOf(SORA), { event: "snapshot", data: [] });

		expect(students.size).toBe(0);
	});

	it("studentで新しい児童が届いたら、最後に足す（児童の数が1増える）", () => {
		const students = applyLessonEvent(mapOf(SORA), { event: "student", data: MAME });

		expect([...students.values()]).toEqual([SORA, MAME]);
		expect(students.size).toBe(2);
	});

	it("studentで同じ児童が届いたら、その児童の状態全体で上書きし、並びと数は変えない", () => {
		const updated: StudentStatus = { ...SORA, clearedCount: 1, lastResult: "succeeded" };
		const students = applyLessonEvent(mapOf(SORA, MAME), { event: "student", data: updated });

		expect([...students.values()]).toEqual([updated, MAME]);
		expect(students.size).toBe(2);
	});

	it("同じ児童が2回届いても、児童の数は1と数える", () => {
		const once = applyLessonEvent(new Map(), { event: "student", data: SORA });
		const twice = applyLessonEvent(once, { event: "student", data: SORA });

		expect(twice.size).toBe(1);
	});

	it.each([
		{ event: "ended", data: null },
		{ event: "ping", data: null },
	] as const)("$eventでは、児童の状態を変えない", (event) => {
		const students = applyLessonEvent(mapOf(SORA, MAME), event);

		expect([...students.values()]).toEqual([SORA, MAME]);
	});

	it("元のMapを書き換えない", () => {
		const before = mapOf(SORA);
		applyLessonEvent(before, { event: "student", data: MAME });
		applyLessonEvent(before, { event: "snapshot", data: [KURO] });

		expect([...before.values()]).toEqual([SORA]);
	});
});
