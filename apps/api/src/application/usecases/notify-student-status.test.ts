/*
 * 教師に児童の状態を送る（仕様書backend.mdの「サーバーからの知らせ（SSE）」）
 * 送り先がないときは何もしないことと、送信に失敗しても児童への応答を変えない（例外にしない）ことを確かめる
 */
import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";

import type { StudentStatus } from "../../domain/entities/student-status";
import type { StudentRepository } from "../../domain/repositories/student-repository";
import { createLessonHub } from "../../domain/services/lesson-hub";
import { notifyStudentStatusUseCase } from "./notify-student-status";

const LESSON = "lesson-a";
const OTHER_LESSON = "lesson-b";

const STATUS: StudentStatus = {
	studentId: "student-1",
	name: "たろう",
	clearedCount: 1,
	lastResult: "failed",
};

// 届くはずの知らせを待つ時間（届けばすぐ返る）
const WAIT_MS = 1000;
// 届かないことを確かめるために待つ時間
const QUIET_MS = 20;

const repositoryWith = (findStatus: (studentId: string) => Promise<StudentStatus>) => {
	const findStatusMock = mock(findStatus);
	const studentRepository: StudentRepository = {
		create: async () => "student-1",
		findName: async () => "たろう",
		findStatus: findStatusMock,
		findStatusesByLesson: async () => [],
	};
	return { studentRepository, findStatus: findStatusMock };
};

// 失敗の記録（console.error）でテストの出力を汚さないように、失敗を起こすテストの間だけ差し替える
const silenced: { mockRestore(): void }[] = [];
const silenceErrorLog = () => {
	silenced.push(spyOn(console, "error").mockImplementation(() => {}));
};

afterEach(() => {
	for (const spy of silenced.splice(0)) spy.mockRestore();
});

describe("notifyStudentStatusUseCase", () => {
	it("その授業の教師に、DBから求めた児童の状態を送る", async () => {
		const lessonHub = createLessonHub();
		const teacher = lessonHub.subscribeTeacher(LESSON);
		const { studentRepository, findStatus } = repositoryWith(async () => STATUS);
		const notifyStudentStatus = notifyStudentStatusUseCase({ studentRepository, lessonHub });

		await notifyStudentStatus({ lessonId: LESSON, studentId: STATUS.studentId });

		expect(findStatus).toHaveBeenCalledTimes(1);
		expect(findStatus).toHaveBeenCalledWith(STATUS.studentId);
		expect(await teacher.next(WAIT_MS)).toEqual({ event: "student", data: STATUS });
	});

	it("他の授業の教師には送らない", async () => {
		const lessonHub = createLessonHub();
		lessonHub.subscribeTeacher(LESSON);
		const otherTeacher = lessonHub.subscribeTeacher(OTHER_LESSON);
		const { studentRepository } = repositoryWith(async () => STATUS);
		const notifyStudentStatus = notifyStudentStatusUseCase({ studentRepository, lessonHub });

		await notifyStudentStatus({ lessonId: LESSON, studentId: STATUS.studentId });

		expect(await otherTeacher.next(QUIET_MS)).toBeNull();
	});

	it("送り先がない（教師が開いていない）ときは、状態を求めず何もしない", async () => {
		const lessonHub = createLessonHub();
		// 児童だけがつないでいる
		const student = lessonHub.subscribeStudent(LESSON);
		const { studentRepository, findStatus } = repositoryWith(async () => STATUS);
		const notifyStudentStatus = notifyStudentStatusUseCase({ studentRepository, lessonHub });

		await notifyStudentStatus({ lessonId: LESSON, studentId: STATUS.studentId });

		expect(findStatus).not.toHaveBeenCalled();
		expect(await student.next(QUIET_MS)).toBeNull();
	});

	it("状態を求めるのに失敗しても、例外にしない（児童への応答を変えない）", async () => {
		silenceErrorLog();
		const lessonHub = createLessonHub();
		const teacher = lessonHub.subscribeTeacher(LESSON);
		const { studentRepository } = repositoryWith(async () => {
			throw new Error("DBにつながりません");
		});
		const notifyStudentStatus = notifyStudentStatusUseCase({ studentRepository, lessonHub });

		const notified = notifyStudentStatus({ lessonId: LESSON, studentId: STATUS.studentId });

		expect(await notified).toBeUndefined();
		expect(await teacher.next(QUIET_MS)).toBeNull();
	});

	it("送るのに失敗しても、例外にしない（児童への応答を変えない）", async () => {
		silenceErrorLog();
		const { studentRepository } = repositoryWith(async () => STATUS);
		const notifyStudentStatus = notifyStudentStatusUseCase({
			studentRepository,
			lessonHub: {
				hasTeachers: () => true,
				sendStudentStatus: () => {
					throw new Error("送れません");
				},
			},
		});

		const notified = notifyStudentStatus({ lessonId: LESSON, studentId: STATUS.studentId });

		expect(await notified).toBeUndefined();
	});
});
