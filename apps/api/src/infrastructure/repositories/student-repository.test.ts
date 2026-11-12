/*
 * 教師に見せる児童の状態（仕様書backend.mdの「教師に見せる状態の求め方」）
 * 表の3行（クリア数・今の問題・今の問題の結果）を、そのままケースにする
 */
import { beforeAll, describe, expect, it, setDefaultTimeout } from "bun:test";

import { TUTORIALS } from "@kasane/core";
import type { Maze } from "@kasane/core";
import { eq, sql } from "drizzle-orm";

import type { StudentStatus } from "../../domain/entities/student-status";
// pnpm testではdotenvで.env.test.localが読み込まれるため、テスト用DBに接続する
import { db } from "../database/drizzle";
import { attempts, lessons, mazes, students, teachers } from "../database/schema";
import { studentRepository } from "./student-repository";

// テスト用DBは遠くにあり、1回の往復に時間がかかるので、既定の5秒より長く待つ
setDefaultTimeout(30_000);

const repository = studentRepository(db);

const ENDS_AT = new Date("2026-11-10T05:00:00.000Z");
// 記録を送った時刻の基準。記録は、並べた順に1秒ずつ後の時刻で入れる
const SENT_FROM = new Date("2026-11-10T01:00:00.000Z").getTime();

// 状態を求めるのに迷路の中身は使わないので、形だけの迷路を入れる
const MAZE: Maze = { startDirection: "east", layers: [] };

const only = <Row>(rows: Row[]): Row => {
	const [row] = rows;
	if (!row) throw new Error("RETURNINGで行が返されませんでした");
	return row;
};

let teacherId: string;
let lessonId: string;

const insertLesson = async () =>
	only(await db.insert(lessons).values({ teacherId, endsAt: ENDS_AT }).returning()).id;

const insertStudent = async (name = "たろう", ofLesson: string = lessonId) =>
	only(
		await db
			.insert(students)
			.values({ lessonId: ofLesson, name, tokenHash: crypto.randomUUID() })
			.returning(),
	).id;

const insertMaze = async (studentId: string) =>
	only(await db.insert(mazes).values({ studentId, name: "めいろ", data: MAZE }).returning()).id;

type Sent = { tutorialNo: number; succeeded: boolean } | { mazeId: string; succeeded: boolean };

const tutorial = (tutorialNo: number, succeeded: boolean): Sent => ({ tutorialNo, succeeded });
const maze = (mazeId: string, succeeded: boolean): Sent => ({ mazeId, succeeded });

// チュートリアルを1問目から順に、全部クリアした記録
const ALL_CLEARED: Sent[] = TUTORIALS.map((_, index) => tutorial(index + 1, true));

// 記録を、並べた順に送ったことにする
const send = async (studentId: string, records: Sent[]) => {
	await db.insert(attempts).values(
		records.map((record, index) => ({
			studentId,
			...record,
			program: [],
			createdAt: new Date(SENT_FROM + index * 1000),
		})),
	);
};

// 記録を送った児童の状態を求める
const statusAfter = async (records: Sent[]): Promise<StudentStatus> => {
	const studentId = await insertStudent();
	if (records.length > 0) await send(studentId, records);
	return repository.findStatus(studentId);
};

const byStudentId = (a: StudentStatus, b: StudentStatus) => a.studentId.localeCompare(b.studentId);

beforeAll(async () => {
	await db.execute(sql`truncate table ${attempts}, ${mazes}, ${students}, ${lessons}, ${teachers}`);

	teacherId = only(await db.insert(teachers).values({ tokenHash: "teacher-hash" }).returning()).id;
	lessonId = await insertLesson();
});

describe("studentRepository", () => {
	describe("create", () => {
		it("児童の行を作り、作った児童のIDを返す", async () => {
			const studentId = await repository.create({
				lessonId,
				name: "はなこ",
				tokenHash: "created-student-hash",
			});
			if (studentId === null) throw new Error("児童の行を作れませんでした");

			const [row] = await db.select().from(students).where(eq(students.id, studentId));
			expect(row).toMatchObject({ lessonId, name: "はなこ", tokenHash: "created-student-hash" });
		});
	});

	describe("findStatus", () => {
		it("児童のIDと名前を返す", async () => {
			const studentId = await insertStudent("じろう");

			const status = await repository.findStatus(studentId);

			expect(status).toEqual({
				studentId,
				name: "じろう",
				clearedCount: 0,
				lastResult: "notSent",
			});
		});

		it("児童の行がなければ例外にする（本人を特定した後に呼ぶ）", async () => {
			const rejection = await repository.findStatus(crypto.randomUUID()).then(
				() => null,
				(error: unknown) => error,
			);

			expect(rejection).toBeInstanceOf(Error);
		});

		describe("クリア数は、成功した記録にあるチュートリアルの種類の数", () => {
			it("記録がなければ0", async () => {
				expect(await statusAfter([])).toMatchObject({ clearedCount: 0 });
			});

			it("成功したチュートリアルの種類を数える", async () => {
				const status = await statusAfter([tutorial(1, true), tutorial(2, true)]);

				expect(status).toMatchObject({ clearedCount: 2 });
			});

			it("同じチュートリアルに何度成功しても、1と数える", async () => {
				const status = await statusAfter([tutorial(1, true), tutorial(1, true)]);

				expect(status).toMatchObject({ clearedCount: 1 });
			});

			it("失敗した記録は数えない", async () => {
				const status = await statusAfter([tutorial(1, true), tutorial(2, false)]);

				expect(status).toMatchObject({ clearedCount: 1 });
			});

			it("自分の迷路への成功は数えない", async () => {
				const studentId = await insertStudent();
				const mazeId = await insertMaze(studentId);
				await send(studentId, [...ALL_CLEARED, maze(mazeId, true), maze(mazeId, true)]);

				const status = await repository.findStatus(studentId);

				expect(status).toMatchObject({ clearedCount: TUTORIALS.length });
			});
		});

		describe("チュートリアルの途中は、今の問題がチュートリアル（クリア数＋1）", () => {
			it("今の問題で一度も送っていなければ、まだ送っていない", async () => {
				expect(await statusAfter([])).toMatchObject({ clearedCount: 0, lastResult: "notSent" });
			});

			it("今の問題で最後に送った記録が失敗なら、失敗", async () => {
				const status = await statusAfter([tutorial(1, false)]);

				expect(status).toMatchObject({ clearedCount: 0, lastResult: "failed" });
			});

			it("今の問題に成功すると次の問題へ移るので、まだ送っていないに戻る", async () => {
				const status = await statusAfter([tutorial(1, false), tutorial(1, true)]);

				expect(status).toMatchObject({ clearedCount: 1, lastResult: "notSent" });
			});

			it("次の問題に失敗すると、失敗", async () => {
				const status = await statusAfter([tutorial(1, true), tutorial(2, false)]);

				expect(status).toMatchObject({ clearedCount: 1, lastResult: "failed" });
			});

			it("クリア済みの問題を後から送って成功しても、今の問題の結果のまま", async () => {
				const status = await statusAfter([
					tutorial(1, true),
					tutorial(2, false),
					tutorial(1, true),
				]);

				expect(status).toMatchObject({ clearedCount: 1, lastResult: "failed" });
			});

			it("クリア済みの問題を後から送って失敗しても、今の問題で送っていなければ、まだ送っていない", async () => {
				const status = await statusAfter([tutorial(1, true), tutorial(1, false)]);

				expect(status).toMatchObject({ clearedCount: 1, lastResult: "notSent" });
			});
		});

		describe("全部クリアした後は、今の問題が最後に送った自分の迷路", () => {
			it("自分の迷路をまだ送っていなければ、まだ送っていない", async () => {
				const status = await statusAfter(ALL_CLEARED);

				expect(status).toMatchObject({ clearedCount: TUTORIALS.length, lastResult: "notSent" });
			});

			it("迷路を作っただけで送っていなければ、まだ送っていない", async () => {
				const studentId = await insertStudent();
				await insertMaze(studentId);
				await send(studentId, ALL_CLEARED);

				const status = await repository.findStatus(studentId);

				expect(status).toMatchObject({ lastResult: "notSent" });
			});

			it("自分の迷路に失敗すると、失敗", async () => {
				const studentId = await insertStudent();
				const mazeId = await insertMaze(studentId);
				await send(studentId, [...ALL_CLEARED, maze(mazeId, false)]);

				const status = await repository.findStatus(studentId);

				expect(status).toMatchObject({ clearedCount: TUTORIALS.length, lastResult: "failed" });
			});

			it("同じ迷路に失敗した後で成功すると、成功", async () => {
				const studentId = await insertStudent();
				const mazeId = await insertMaze(studentId);
				await send(studentId, [...ALL_CLEARED, maze(mazeId, false), maze(mazeId, true)]);

				const status = await repository.findStatus(studentId);

				expect(status).toMatchObject({ lastResult: "succeeded" });
			});

			it("同じ迷路に成功した後で失敗すると、失敗", async () => {
				const studentId = await insertStudent();
				const mazeId = await insertMaze(studentId);
				await send(studentId, [...ALL_CLEARED, maze(mazeId, true), maze(mazeId, false)]);

				const status = await repository.findStatus(studentId);

				expect(status).toMatchObject({ lastResult: "failed" });
			});

			it("別の迷路を後から送ると、その迷路の結果になる（成功の後に、別の迷路で失敗）", async () => {
				const studentId = await insertStudent();
				const first = await insertMaze(studentId);
				const second = await insertMaze(studentId);
				await send(studentId, [...ALL_CLEARED, maze(first, true), maze(second, false)]);

				const status = await repository.findStatus(studentId);

				expect(status).toMatchObject({ lastResult: "failed" });
			});

			it("別の迷路を後から送ると、その迷路の結果になる（失敗の後に、別の迷路で成功）", async () => {
				const studentId = await insertStudent();
				const first = await insertMaze(studentId);
				const second = await insertMaze(studentId);
				await send(studentId, [...ALL_CLEARED, maze(first, false), maze(second, true)]);

				const status = await repository.findStatus(studentId);

				expect(status).toMatchObject({ lastResult: "succeeded" });
			});

			it("チュートリアルを後から送って失敗しても、最後に送った迷路の結果のまま", async () => {
				const studentId = await insertStudent();
				const mazeId = await insertMaze(studentId);
				await send(studentId, [...ALL_CLEARED, maze(mazeId, true), tutorial(3, false)]);

				const status = await repository.findStatus(studentId);

				expect(status).toMatchObject({ clearedCount: TUTORIALS.length, lastResult: "succeeded" });
			});

			it("チュートリアルを後から送って失敗しても、迷路を送っていなければ、まだ送っていない", async () => {
				const status = await statusAfter([...ALL_CLEARED, tutorial(3, false)]);

				expect(status).toMatchObject({ clearedCount: TUTORIALS.length, lastResult: "notSent" });
			});

			it("最後に送った迷路を消すと、残っている記録から求め直す", async () => {
				const studentId = await insertStudent();
				const kept = await insertMaze(studentId);
				const deleted = await insertMaze(studentId);
				await send(studentId, [...ALL_CLEARED, maze(kept, true), maze(deleted, false)]);

				// 迷路を消すと、その迷路への記録も一緒に消える
				await db.delete(mazes).where(eq(mazes.id, deleted));
				const status = await repository.findStatus(studentId);

				expect(status).toMatchObject({ clearedCount: TUTORIALS.length, lastResult: "succeeded" });
			});

			it("送った迷路をすべて消すと、まだ送っていないに戻る", async () => {
				const studentId = await insertStudent();
				const mazeId = await insertMaze(studentId);
				await send(studentId, [...ALL_CLEARED, maze(mazeId, true)]);

				await db.delete(mazes).where(eq(mazes.id, mazeId));
				const status = await repository.findStatus(studentId);

				expect(status).toMatchObject({ clearedCount: TUTORIALS.length, lastResult: "notSent" });
			});
		});
	});

	describe("findStatusesByLesson", () => {
		it("記録のない児童も含めて、その授業の全児童の状態を返す", async () => {
			const ofLesson = await insertLesson();
			const joined = await insertStudent("たろう", ofLesson);
			const failing = await insertStudent("じろう", ofLesson);
			const cleared = await insertStudent("はなこ", ofLesson);
			await send(failing, [tutorial(1, false)]);
			await send(cleared, [tutorial(1, true), tutorial(2, true)]);

			const statuses = await repository.findStatusesByLesson(ofLesson, teacherId);

			const expected: StudentStatus[] = [
				{ studentId: joined, name: "たろう", clearedCount: 0, lastResult: "notSent" },
				{ studentId: failing, name: "じろう", clearedCount: 0, lastResult: "failed" },
				{ studentId: cleared, name: "はなこ", clearedCount: 2, lastResult: "notSent" },
			];
			expect(statuses.toSorted(byStudentId)).toEqual(expected.toSorted(byStudentId));
		});

		it("それぞれの児童の状態は、findStatusで求めた状態と同じ", async () => {
			const ofLesson = await insertLesson();
			const graduate = await insertStudent("たろう", ofLesson);
			const beginner = await insertStudent("じろう", ofLesson);
			const mazeId = await insertMaze(graduate);
			await send(graduate, [...ALL_CLEARED, maze(mazeId, false), maze(mazeId, true)]);
			await send(beginner, [tutorial(1, true), tutorial(2, false), tutorial(1, false)]);

			const statuses = await repository.findStatusesByLesson(ofLesson, teacherId);

			const each = await Promise.all([
				repository.findStatus(graduate),
				repository.findStatus(beginner),
			]);
			expect(statuses.toSorted(byStudentId)).toEqual(each.toSorted(byStudentId));
			expect(each).toEqual([
				{
					studentId: graduate,
					name: "たろう",
					clearedCount: TUTORIALS.length,
					lastResult: "succeeded",
				},
				{ studentId: beginner, name: "じろう", clearedCount: 1, lastResult: "failed" },
			]);
		});

		it("他の授業の児童を含めない", async () => {
			const ofLesson = await insertLesson();
			const otherLesson = await insertLesson();
			const studentId = await insertStudent("たろう", ofLesson);
			const outsider = await insertStudent("よその子", otherLesson);
			await send(outsider, [tutorial(1, true)]);

			const statuses = await repository.findStatusesByLesson(ofLesson, teacherId);

			expect(statuses).toEqual([
				{ studentId, name: "たろう", clearedCount: 0, lastResult: "notSent" },
			]);
		});

		it("同じ名前の児童がいても、別の児童として返す", async () => {
			const ofLesson = await insertLesson();
			const first = await insertStudent("たろう", ofLesson);
			const second = await insertStudent("たろう", ofLesson);
			await send(second, [tutorial(1, true)]);

			const statuses = await repository.findStatusesByLesson(ofLesson, teacherId);

			const expected: StudentStatus[] = [
				{ studentId: first, name: "たろう", clearedCount: 0, lastResult: "notSent" },
				{ studentId: second, name: "たろう", clearedCount: 1, lastResult: "notSent" },
			];
			expect(statuses.toSorted(byStudentId)).toEqual(expected.toSorted(byStudentId));
		});

		it("児童を、参加した順に返す（教師の画面は、児童を参加順に並べる）", async () => {
			const ofLesson = await insertLesson();
			const joinedAt = (minutes: number) => new Date(SENT_FROM + minutes * 60 * 1000);
			// 行を入れる順番と、参加した時刻の順番を変えておく
			const [third, first, second] = await db
				.insert(students)
				.values([
					{ lessonId: ofLesson, name: "さぶろう", tokenHash: "third", createdAt: joinedAt(3) },
					{ lessonId: ofLesson, name: "たろう", tokenHash: "first", createdAt: joinedAt(1) },
					{ lessonId: ofLesson, name: "じろう", tokenHash: "second", createdAt: joinedAt(2) },
				])
				.returning();
			if (!first || !second || !third) throw new Error("RETURNINGで行が返されませんでした");
			// 記録の有無で並びが変わらない
			await send(second.id, [tutorial(1, true)]);

			const statuses = await repository.findStatusesByLesson(ofLesson, teacherId);

			expect(statuses.map((status) => status.name)).toEqual(["たろう", "じろう", "さぶろう"]);
			expect(statuses.map((status) => status.studentId)).toEqual([first.id, second.id, third.id]);
		});

		it("他の教師のIDでは、その授業の児童を返さない（本人のIDも条件に入れる）", async () => {
			const ofLesson = await insertLesson();
			await insertStudent("たろう", ofLesson);
			const otherTeacherId = only(
				await db.insert(teachers).values({ tokenHash: "other-teacher-hash" }).returning(),
			).id;

			expect(await repository.findStatusesByLesson(ofLesson, otherTeacherId)).toEqual([]);
		});

		it("児童がいない授業は、空の配列を返す", async () => {
			const ofLesson = await insertLesson();

			expect(await repository.findStatusesByLesson(ofLesson, teacherId)).toEqual([]);
		});
	});
});
