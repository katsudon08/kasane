/*
 * 授業ごとの送り先（仕様書backend.mdの「サーバーからの知らせ（SSE）」）
 * 教師用と児童用を別に持ち、他の授業・他の立場の送り先には届かないことを確かめる
 */
import { describe, expect, it } from "bun:test";

import type { StudentStatus } from "../entities/student-status";
import { createLessonHub } from "./lesson-hub";

const LESSON = "lesson-a";
const OTHER_LESSON = "lesson-b";

const STATUS: StudentStatus = {
	studentId: "student-1",
	name: "たろう",
	clearedCount: 2,
	lastResult: "failed",
};
const STUDENT = { event: "student", data: STATUS } as const;
const ENDED = { event: "ended", data: null } as const;

// 届くはずの知らせを待つ時間（届けばすぐ返る）
const WAIT_MS = 1000;
// 届かないことを確かめるために待つ時間
const QUIET_MS = 20;

describe("createLessonHub", () => {
	describe("sendStudentStatus", () => {
		it("その授業の教師の送り先に、studentとして届く", async () => {
			const hub = createLessonHub();
			const teacher = hub.subscribeTeacher(LESSON);

			hub.sendStudentStatus(LESSON, STATUS);

			expect(await teacher.next(WAIT_MS)).toEqual(STUDENT);
		});

		it("同じ授業に複数つないでいれば、それぞれの送り先に届く", async () => {
			const hub = createLessonHub();
			const firstTab = hub.subscribeTeacher(LESSON);
			const secondTab = hub.subscribeTeacher(LESSON);

			hub.sendStudentStatus(LESSON, STATUS);

			expect(await firstTab.next(WAIT_MS)).toEqual(STUDENT);
			expect(await secondTab.next(WAIT_MS)).toEqual(STUDENT);
		});

		it("同じ授業の児童の送り先には届かない", async () => {
			const hub = createLessonHub();
			const student = hub.subscribeStudent(LESSON);

			hub.sendStudentStatus(LESSON, STATUS);

			expect(await student.next(QUIET_MS)).toBeNull();
		});

		it("他の授業の教師の送り先には届かない", async () => {
			const hub = createLessonHub();
			const otherTeacher = hub.subscribeTeacher(OTHER_LESSON);

			hub.sendStudentStatus(LESSON, STATUS);

			expect(await otherTeacher.next(QUIET_MS)).toBeNull();
		});

		it("送り先がなければ何もしない", () => {
			const hub = createLessonHub();

			expect(() => hub.sendStudentStatus(LESSON, STATUS)).not.toThrow();
		});
	});

	describe("sendEnded", () => {
		it("その授業の教師と児童の全員に、endedとして届く", async () => {
			const hub = createLessonHub();
			const teacher = hub.subscribeTeacher(LESSON);
			const otherTab = hub.subscribeTeacher(LESSON);
			const student = hub.subscribeStudent(LESSON);
			const otherStudent = hub.subscribeStudent(LESSON);

			hub.sendEnded(LESSON);

			expect(await teacher.next(WAIT_MS)).toEqual(ENDED);
			expect(await otherTab.next(WAIT_MS)).toEqual(ENDED);
			expect(await student.next(WAIT_MS)).toEqual(ENDED);
			expect(await otherStudent.next(WAIT_MS)).toEqual(ENDED);
		});

		it("他の授業の教師と児童には届かない", async () => {
			const hub = createLessonHub();
			const otherTeacher = hub.subscribeTeacher(OTHER_LESSON);
			const otherStudent = hub.subscribeStudent(OTHER_LESSON);

			hub.sendEnded(LESSON);

			expect(await otherTeacher.next(QUIET_MS)).toBeNull();
			expect(await otherStudent.next(QUIET_MS)).toBeNull();
		});

		it("送り先がなければ何もしない", () => {
			const hub = createLessonHub();

			expect(() => hub.sendEnded(LESSON)).not.toThrow();
		});
	});

	describe("送り先", () => {
		it("待っている間に届いた知らせを、待つ時間が過ぎる前に受け取る", async () => {
			const hub = createLessonHub();
			const teacher = hub.subscribeTeacher(LESSON);

			const waiting = teacher.next(WAIT_MS);
			hub.sendStudentStatus(LESSON, STATUS);

			expect(await waiting).toEqual(STUDENT);
		});

		it("待つ前に届いていた知らせを、届いた順に受け取る", async () => {
			const hub = createLessonHub();
			const teacher = hub.subscribeTeacher(LESSON);
			const later: StudentStatus = { ...STATUS, clearedCount: 3, lastResult: "notSent" };

			hub.sendStudentStatus(LESSON, STATUS);
			hub.sendStudentStatus(LESSON, later);
			hub.sendEnded(LESSON);

			expect(await teacher.next(WAIT_MS)).toEqual(STUDENT);
			expect(await teacher.next(WAIT_MS)).toEqual({ event: "student", data: later });
			expect(await teacher.next(WAIT_MS)).toEqual(ENDED);
		});

		it("待つ時間の間に何も届かなければ、nullを返す", async () => {
			const hub = createLessonHub();
			const teacher = hub.subscribeTeacher(LESSON);

			expect(await teacher.next(QUIET_MS)).toBeNull();
		});

		it("待つ時間が過ぎた後に届いた知らせは、次に待ったときに受け取る", async () => {
			const hub = createLessonHub();
			const teacher = hub.subscribeTeacher(LESSON);

			expect(await teacher.next(QUIET_MS)).toBeNull();
			hub.sendStudentStatus(LESSON, STATUS);

			expect(await teacher.next(WAIT_MS)).toEqual(STUDENT);
		});

		it("外した送り先には届かず、残りの送り先には届く", async () => {
			const hub = createLessonHub();
			const closed = hub.subscribeTeacher(LESSON);
			const open = hub.subscribeTeacher(LESSON);

			closed.close();
			hub.sendStudentStatus(LESSON, STATUS);

			expect(await open.next(WAIT_MS)).toEqual(STUDENT);
			expect(await closed.next(QUIET_MS)).toBeNull();
		});

		it("外した児童の送り先には、endedも届かない", async () => {
			const hub = createLessonHub();
			const closed = hub.subscribeStudent(LESSON);
			const open = hub.subscribeStudent(LESSON);

			closed.close();
			hub.sendEnded(LESSON);

			expect(await open.next(WAIT_MS)).toEqual(ENDED);
			expect(await closed.next(QUIET_MS)).toBeNull();
		});

		it("同じ送り先を二度外しても、後からつないだ送り先に届く", async () => {
			const hub = createLessonHub();
			const first = hub.subscribeTeacher(LESSON);
			first.close();
			const second = hub.subscribeTeacher(LESSON);

			first.close();
			hub.sendStudentStatus(LESSON, STATUS);

			expect(await second.next(WAIT_MS)).toEqual(STUDENT);
		});
	});

	describe("hasTeachers", () => {
		it("その授業に教師の送り先があるときだけtrue", () => {
			const hub = createLessonHub();

			expect(hub.hasTeachers(LESSON)).toBe(false);

			hub.subscribeTeacher(LESSON);

			expect(hub.hasTeachers(LESSON)).toBe(true);
			expect(hub.hasTeachers(OTHER_LESSON)).toBe(false);
		});

		it("児童の送り先だけではfalse", () => {
			const hub = createLessonHub();

			hub.subscribeStudent(LESSON);

			expect(hub.hasTeachers(LESSON)).toBe(false);
		});

		it("教師の送り先をすべて外すとfalseに戻る", () => {
			const hub = createLessonHub();
			const firstTab = hub.subscribeTeacher(LESSON);
			const secondTab = hub.subscribeTeacher(LESSON);

			firstTab.close();
			expect(hub.hasTeachers(LESSON)).toBe(true);

			secondTab.close();
			expect(hub.hasTeachers(LESSON)).toBe(false);
		});
	});
});
