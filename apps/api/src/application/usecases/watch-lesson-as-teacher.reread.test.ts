/*
 * 教師が授業の知らせを受け取り始めるときに、送り先に登録した後で授業をDBから読み直す
 * （仕様書backend.mdの「サーバーからの知らせ（SSE）」の「授業が終わっていないことは、送り先に登録した後にDBを読み直して確かめる」）
 * 確かめてから登録するまでの間に授業が終わっても、endedを取りこぼさないことを確かめる
 */
import { describe, expect, it, mock } from "bun:test";

import type { Lesson } from "../../domain/entities/lesson";
import type { StudentStatus } from "../../domain/entities/student-status";
import type { LessonRepository } from "../../domain/repositories/lesson-repository";
import type { StudentRepository } from "../../domain/repositories/student-repository";
import { createLessonHub } from "../../domain/services/lesson-hub";
import { watchLessonAsTeacherUseCase } from "./watch-lesson-as-teacher";

const TEACHER = "teacher-1";

// 授業が終わる時刻と、その前の時刻
const ENDS_AT = new Date("2026-11-10T05:00:00.000Z");
const NOW = new Date("2026-11-10T02:00:00.000Z");

// 開いている授業
const LESSON: Lesson = {
	lessonId: "lesson-a",
	createdAt: new Date("2026-11-10T00:00:00.000Z"),
	endsAt: ENDS_AT,
};
// 教師が「授業を終える」を押して、終わる時刻が今の時刻で上書きされた授業
const CLOSED_LESSON: Lesson = { ...LESSON, endsAt: NOW };

const STATUS: StudentStatus = {
	studentId: "student-1",
	name: "たろう",
	clearedCount: 0,
	lastResult: "notSent",
};

const ENDED = { event: "ended", data: null } as const;

// 間隔を待たずに届くことを確かめるための、長い間隔
const LONG_INTERVAL_MS = 60 * 1000;

type FindById = (lessonId: string) => Promise<Lesson | null>;

type Setup = {
	// 登録の前に、本人の授業かを確かめるために読んだ結果
	owned?: Lesson | null;
	// 登録の後に、読み直した結果
	findById?: FindById;
};

const setup = ({ owned = LESSON, findById = async () => LESSON }: Setup = {}) => {
	const lessonHub = createLessonHub();
	const findByIdMock = mock(findById);
	const lessonRepository: LessonRepository = {
		create: async () => LESSON.lessonId,
		findOpenByTeacher: async () => [],
		findByIdAndTeacher: async () => owned,
		findById: findByIdMock,
		updateEndsAt: async () => {},
	};
	const findStatusesByLesson = mock(async (_lessonId: string, _teacherId: string) => [STATUS]);
	const studentRepository: StudentRepository = {
		create: async () => STATUS.studentId,
		findName: async () => STATUS.name,
		findStatus: async () => STATUS,
		findStatusesByLesson,
	};
	const watch = () =>
		watchLessonAsTeacherUseCase({
			lessonRepository,
			studentRepository,
			lessonHub,
			pingIntervalMs: LONG_INTERVAL_MS,
			now: () => NOW,
		})({ teacherId: TEACHER, lessonId: LESSON.lessonId });

	return { watch, lessonHub, findById: findByIdMock, findStatusesByLesson };
};

// 次の知らせを一つ取り出す。流れが終わっていればnull
const take = async <Event>(events: AsyncGenerator<Event>): Promise<Event | null> => {
	const { done, value } = await events.next();
	return done ? null : value;
};

describe("watchLessonAsTeacherUseCase（登録した後の読み直し）", () => {
	it("送り先に登録した後に、授業をDBの授業のIDで読み直す", async () => {
		const registeredWhenRead: boolean[] = [];
		const { watch, lessonHub, findById } = setup({
			findById: async (lessonId) => {
				registeredWhenRead.push(lessonHub.hasTeachers(lessonId));
				return LESSON;
			},
		});

		const result = await watch();

		expect(result.ok).toBe(true);
		expect(findById).toHaveBeenCalledTimes(1);
		expect(findById).toHaveBeenCalledWith(LESSON.lessonId);
		expect(registeredWhenRead).toEqual([true]);
	});

	it("読み直すと終わっていたら（確かめてから登録するまでの間に終わった）、送り先から外してlessonEndedを返す", async () => {
		const { watch, lessonHub, findStatusesByLesson } = setup({
			findById: async () => CLOSED_LESSON,
		});

		const result = await watch();

		expect(result).toEqual({ ok: false, reason: "lessonEnded" });
		expect(lessonHub.hasTeachers(LESSON.lessonId)).toBe(false);
		expect(findStatusesByLesson).not.toHaveBeenCalled();
	});

	it("読み直した結果が終わる前なら、その後に送られたendedを取りこぼさない", async () => {
		const { watch, lessonHub } = setup({
			findById: async (lessonId) => {
				// 終わる前の授業を読んだ直後に、教師が授業を終える（終わる時刻を上書きしてからendedを送る）
				lessonHub.sendEnded(lessonId);
				return LESSON;
			},
		});

		const result = await watch();
		if (!result.ok) throw new Error(`受け取りを始められませんでした: ${result.reason}`);

		expect(await take(result.events)).toEqual({ event: "snapshot", data: [STATUS] });
		expect(await take(result.events)).toEqual(ENDED);
		expect(await take(result.events)).toBeNull();
		expect(lessonHub.hasTeachers(LESSON.lessonId)).toBe(false);
	});

	it("他の教師の授業・存在しない授業は、送り先に登録せず、読み直しもせずにnotFoundを返す", async () => {
		const { watch, lessonHub, findById } = setup({ owned: null });

		const result = await watch();

		expect(result).toEqual({ ok: false, reason: "notFound" });
		expect(lessonHub.hasTeachers(LESSON.lessonId)).toBe(false);
		expect(findById).not.toHaveBeenCalled();
	});

	it("読み直せなければ、送り先から外して例外にする（知らせを流し始めない）", async () => {
		const { watch, lessonHub, findStatusesByLesson } = setup({
			findById: async () => {
				throw new Error("DBにつながりません");
			},
		});

		const rejection = await watch().then(
			() => null,
			(error: unknown) => error,
		);

		expect(rejection).toHaveProperty("message", "DBにつながりません");
		expect(lessonHub.hasTeachers(LESSON.lessonId)).toBe(false);
		expect(findStatusesByLesson).not.toHaveBeenCalled();
	});
});
