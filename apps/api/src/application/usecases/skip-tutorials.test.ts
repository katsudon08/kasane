/*
 * 問題を飛ばす（仕様書backend.mdのPOST /me/tutorials/skip）
 * to - 1問目までをクリアしたことにして、その後に教師へ児童の状態を送ることを確かめる
 * toの範囲（2〜チュートリアルの数＋1）の外は、型の検証をすり抜けても値で断る
 */
import { describe, expect, it, mock } from "bun:test";

import { TUTORIALS } from "@kasane/core";

import { skipTutorialsUseCase } from "./skip-tutorials";

const STUDENT = "student-1";
const LESSON = "lesson-a";

const setup = () => {
	const calls: string[] = [];
	const skipThrough = mock(async (_studentId: string, _through: number) => {
		calls.push("skip");
	});
	const notifyStudentStatus = mock(async (_target: { lessonId: string; studentId: string }) => {
		calls.push("notify");
	});
	const skipTutorials = skipTutorialsUseCase({
		tutorialSkipRepository: { skipThrough },
		notifyStudentStatus,
	});
	return { skipTutorials, skipThrough, notifyStudentStatus, calls };
};

describe("skipTutorialsUseCase", () => {
	it("to - 1問目までを飛ばし、その後に教師へ児童の状態を送る", async () => {
		const { skipTutorials, skipThrough, notifyStudentStatus, calls } = setup();

		const result = await skipTutorials({ studentId: STUDENT, lessonId: LESSON, to: 4 });

		expect(result).toEqual({ ok: true });
		expect(skipThrough).toHaveBeenCalledWith(STUDENT, 3);
		expect(notifyStudentStatus).toHaveBeenCalledWith({ lessonId: LESSON, studentId: STUDENT });
		expect(calls).toEqual(["skip", "notify"]);
	});

	it("全部飛ばす（チュートリアルの数＋1）なら、全部の問題を飛ばす", async () => {
		const { skipTutorials, skipThrough } = setup();

		await skipTutorials({ studentId: STUDENT, lessonId: LESSON, to: TUTORIALS.length + 1 });

		expect(skipThrough).toHaveBeenCalledWith(STUDENT, TUTORIALS.length);
	});

	it.each([1, 0, TUTORIALS.length + 2, 2.5])("toが%pなら、飛ばさずにinvalidInput", async (to) => {
		const { skipTutorials, skipThrough, notifyStudentStatus } = setup();

		const result = await skipTutorials({ studentId: STUDENT, lessonId: LESSON, to });

		expect(result).toEqual({ ok: false, reason: "invalidInput" });
		expect(skipThrough).not.toHaveBeenCalled();
		expect(notifyStudentStatus).not.toHaveBeenCalled();
	});
});
