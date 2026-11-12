/*
 * 教師が授業の知らせを受け取り始める（仕様書backend.mdの「サーバーからの知らせ（SSE）」）
 * つなぐ前の確認・送り先への登録と全児童の状態を読む順番・接続が切れたときの後始末を確かめる
 */
import { describe, expect, it, mock } from "bun:test";

import type { Lesson } from "../../domain/entities/lesson";
import type { StudentStatus } from "../../domain/entities/student-status";
import type { LessonRepository } from "../../domain/repositories/lesson-repository";
import type { StudentRepository } from "../../domain/repositories/student-repository";
import { createLessonHub } from "../../domain/services/lesson-hub";
import type { LessonHub } from "../../domain/services/lesson-hub";
import { watchLessonAsTeacherUseCase } from "./watch-lesson-as-teacher";

const TEACHER = "teacher-1";

// 授業が終わる時刻と、その前の時刻
const ENDS_AT = new Date("2026-11-10T05:00:00.000Z");
const BEFORE_END = new Date("2026-11-10T04:59:59.999Z");

const LESSON: Lesson = {
	lessonId: "lesson-a",
	createdAt: new Date("2026-11-10T00:00:00.000Z"),
	endsAt: ENDS_AT,
};

const STATUS: StudentStatus = {
	studentId: "student-1",
	name: "たろう",
	clearedCount: 0,
	lastResult: "notSent",
};
const CHANGED: StudentStatus = { ...STATUS, lastResult: "failed" };

const PING = { event: "ping", data: null } as const;
const ENDED = { event: "ended", data: null } as const;

// テストでは、空の知らせの間隔を短くする
const PING_INTERVAL_MS = 20;

type FindStatusesByLesson = (lessonId: string, teacherId: string) => Promise<StudentStatus[]>;

type Setup = {
	lesson?: Lesson | null;
	lessonHub?: LessonHub;
	findStatusesByLesson?: FindStatusesByLesson;
	now?: () => Date;
};

const setup = ({
	lesson = LESSON,
	lessonHub = createLessonHub(),
	findStatusesByLesson = async () => [STATUS],
	now = () => BEFORE_END,
}: Setup = {}) => {
	const findByIdAndTeacher = mock(async (_lessonId: string, _teacherId: string) => lesson);
	const lessonRepository: LessonRepository = {
		create: async () => LESSON.lessonId,
		findOpenByTeacher: async () => [],
		findByIdAndTeacher,
		findById: async () => lesson,
		updateEndsAt: async () => {},
	};
	const findStatusesByLessonMock = mock(findStatusesByLesson);
	const studentRepository: StudentRepository = {
		create: async () => STATUS.studentId,
		findName: async () => STATUS.name,
		findStatus: async () => STATUS,
		findStatusesByLesson: findStatusesByLessonMock,
	};
	const watchLessonAsTeacher = watchLessonAsTeacherUseCase({
		lessonRepository,
		studentRepository,
		lessonHub,
		pingIntervalMs: PING_INTERVAL_MS,
		now,
	});
	// パスの授業のIDは、DBの授業のIDと大文字・小文字が違うことがある
	const watch = (lessonId: string = LESSON.lessonId) =>
		watchLessonAsTeacher({ teacherId: TEACHER, lessonId });

	return {
		watch,
		lessonHub,
		findByIdAndTeacher,
		findStatusesByLesson: findStatusesByLessonMock,
	};
};

// 受け取りを始める。始められなければテストを失敗させる
const start = async (watch: ReturnType<typeof setup>["watch"]) => {
	const result = await watch();
	if (!result.ok) throw new Error(`受け取りを始められませんでした: ${result.reason}`);
	return result.events;
};

// 次の知らせを一つ取り出す。流れが終わっていればnull
const take = async <Event>(events: AsyncGenerator<Event>): Promise<Event | null> => {
	const { done, value } = await events.next();
	return done ? null : value;
};

describe("watchLessonAsTeacherUseCase", () => {
	describe("つなぐ前の確認", () => {
		it("その教師の授業を、授業のIDと教師のIDで引く", async () => {
			const { watch, findByIdAndTeacher } = setup();

			await watch();

			expect(findByIdAndTeacher).toHaveBeenCalledTimes(1);
			expect(findByIdAndTeacher).toHaveBeenCalledWith(LESSON.lessonId, TEACHER);
		});

		it("他の教師の授業・存在しない授業は、送り先に登録せずnotFoundを返す", async () => {
			const { watch, lessonHub, findStatusesByLesson } = setup({ lesson: null });

			const result = await watch();

			expect(result).toEqual({ ok: false, reason: "notFound" });
			expect(lessonHub.hasTeachers(LESSON.lessonId)).toBe(false);
			expect(findStatusesByLesson).not.toHaveBeenCalled();
		});

		it("終わっている授業は、送り先に登録せずlessonEndedを返す", async () => {
			const { watch, lessonHub, findStatusesByLesson } = setup({ now: () => ENDS_AT });

			const result = await watch();

			expect(result).toEqual({ ok: false, reason: "lessonEnded" });
			expect(lessonHub.hasTeachers(LESSON.lessonId)).toBe(false);
			expect(findStatusesByLesson).not.toHaveBeenCalled();
		});

		it("全児童の状態を読めなければ、送り先から外して例外にする（知らせを流し始めない）", async () => {
			const { watch, lessonHub } = setup({
				findStatusesByLesson: async () => {
					throw new Error("DBにつながりません");
				},
			});

			const rejection = await watch().then(
				() => null,
				(error: unknown) => error,
			);

			expect(rejection).toHaveProperty("message", "DBにつながりません");
			expect(lessonHub.hasTeachers(LESSON.lessonId)).toBe(false);
		});
	});

	describe("つないだ後", () => {
		it("最初に、全児童の状態をsnapshotで流す", async () => {
			const { watch, findStatusesByLesson } = setup();

			const events = await start(watch);

			expect(await take(events)).toEqual({ event: "snapshot", data: [STATUS] });
			// 授業のIDだけでなく、本人（教師）のIDも渡す
			expect(findStatusesByLesson).toHaveBeenCalledWith(LESSON.lessonId, TEACHER);
			await events.return();
		});

		it("先に送り先に登録してから、全児童の状態を読む", async () => {
			const lessonHub = createLessonHub();
			const { watch } = setup({
				lessonHub,
				findStatusesByLesson: async (lessonId) => {
					// 全児童の状態を読んでいる間に、児童の状態が変わる
					expect(lessonHub.hasTeachers(lessonId)).toBe(true);
					lessonHub.sendStudentStatus(lessonId, CHANGED);
					return [STATUS];
				},
			});

			const events = await start(watch);

			// 読んでいる間の変化を取りこぼさず、snapshotの後に流す
			expect(await take(events)).toEqual({ event: "snapshot", data: [STATUS] });
			expect(await take(events)).toEqual({ event: "student", data: CHANGED });
			await events.return();
		});

		it("送り先には、DBから読んだ授業のIDで登録する", async () => {
			const { watch, lessonHub } = setup();

			// パスの授業のIDは、大文字でも同じ授業に当たる
			const result = await watch(LESSON.lessonId.toUpperCase());

			expect(result.ok).toBe(true);
			expect(lessonHub.hasTeachers(LESSON.lessonId)).toBe(true);
		});

		it("snapshotの後は、届いた児童の状態と空の知らせを流す", async () => {
			const { watch, lessonHub } = setup();
			const events = await start(watch);
			await take(events);

			lessonHub.sendStudentStatus(LESSON.lessonId, CHANGED);

			expect(await take(events)).toEqual({ event: "student", data: CHANGED });
			expect(await take(events)).toEqual(PING);
			await events.return();
		});

		it("授業が終わると、endedを流して終わり、送り先から外れる", async () => {
			const { watch, lessonHub } = setup();
			const events = await start(watch);
			await take(events);

			lessonHub.sendEnded(LESSON.lessonId);

			expect(await take(events)).toEqual(ENDED);
			expect(await take(events)).toBeNull();
			expect(lessonHub.hasTeachers(LESSON.lessonId)).toBe(false);
		});

		it("授業が終わる時刻になると、空の知らせの代わりにendedを流して終わり、送り先から外れる", async () => {
			let now = BEFORE_END;
			const { watch, lessonHub } = setup({ now: () => now });
			const events = await start(watch);
			await take(events);

			expect(await take(events)).toEqual(PING);
			now = ENDS_AT;

			expect(await take(events)).toEqual(ENDED);
			expect(await take(events)).toBeNull();
			expect(lessonHub.hasTeachers(LESSON.lessonId)).toBe(false);
		});

		it("接続が切れると、送り先から外れる", async () => {
			const { watch, lessonHub } = setup();
			const events = await start(watch);
			await take(events);
			expect(lessonHub.hasTeachers(LESSON.lessonId)).toBe(true);

			await events.return();

			expect(lessonHub.hasTeachers(LESSON.lessonId)).toBe(false);
		});
	});
});
