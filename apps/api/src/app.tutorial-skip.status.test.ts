/*
 * 問題を飛ばした後の挑戦と、教師に見せる状態（仕様書README.mdの「問題を飛ばす」、backend.mdの「教師に見せる状態の求め方」）
 * - 飛ばした問題は、そのまま遊べる。解いてもクリア数は変わらない
 * - 飛ばした後の今の問題（クリア数＋1）の結果は、その問題で最後に送った記録で決まる
 * - 全部飛ばした後の今の問題は、最後に送った自分の迷路
 */
import { beforeAll, describe, expect, it, setDefaultTimeout } from "bun:test";

import type { Command, Program } from "@kasane/core";
import { TUTORIALS } from "@kasane/core";
import { sql } from "drizzle-orm";

import { createApp } from "./app";
import { generateToken, hashToken } from "./domain/services/token";
// pnpm testではdotenvで.env.test.localが読み込まれるため、テスト用DBに接続する
import { db } from "./infrastructure/database/drizzle";
import { attempts, lessons, mazes, students, teachers } from "./infrastructure/database/schema";
import { studentRepository } from "./infrastructure/repositories/student-repository";

// テスト用DBは遠くにあり、1回の往復に時間がかかるので、既定の5秒より長く待つ
setDefaultTimeout(60_000);

const app = createApp({ db });

const call = (method: string, path: string, token: string, body?: unknown) =>
	app.handle(
		new Request(`http://localhost${path}`, {
			method,
			headers: {
				authorization: `Bearer ${token}`,
				...(body === undefined ? {} : { "content-type": "application/json" }),
			},
			body: body === undefined ? undefined : JSON.stringify(body),
		}),
	);

const only = <Row>(rows: Row[]): Row => {
	const [row] = rows;
	if (!row) throw new Error("行が返されませんでした");
	return row;
};

const forward: Command = { type: "forward" };
const right: Command = { type: "right" };

// domain.mdの2問目の解答の例: 前×2、右、前×2、右、前×2
const TUTORIAL_2_SOLUTION: Program = [
	forward,
	forward,
	right,
	forward,
	forward,
	right,
	forward,
	forward,
];

// 一辺5マス・1階の、スタートから東へ4マス進むとゴールの迷路
const MAZE = {
	startDirection: "east" as const,
	layers: [
		[
			["start", "floor", "floor", "floor", "goal"],
			["wall", "wall", "wall", "wall", "wall"],
			["wall", "wall", "wall", "wall", "wall"],
			["wall", "wall", "wall", "wall", "wall"],
			["wall", "wall", "wall", "wall", "wall"],
		],
	] as ("start" | "floor" | "goal" | "wall")[][][],
};

let lessonId: string;

const seedStudent = async () => {
	const token = generateToken();
	const student = only(
		await db
			.insert(students)
			.values({ lessonId, name: "たろう", tokenHash: hashToken(token) })
			.returning(),
	);
	return { token, studentId: student.id };
};

const clearedCountOf = async (token: string): Promise<number> => {
	const res = await call("GET", "/me", token);
	return ((await res.json()) as { clearedCount: number }).clearedCount;
};

const statusOf = (studentId: string) => studentRepository(db).findStatus(studentId);

beforeAll(async () => {
	await db.execute(sql`truncate table ${attempts}, ${mazes}, ${students}, ${lessons}, ${teachers}`);
	const teacher = only(
		await db
			.insert(teachers)
			.values({ tokenHash: hashToken(generateToken()) })
			.returning(),
	);
	const lesson = only(
		await db
			.insert(lessons)
			.values({ teacherId: teacher.id, endsAt: new Date(Date.now() + 60 * 60 * 1000) })
			.returning(),
	);
	lessonId = lesson.id;
});

describe("問題を飛ばした後", () => {
	it("飛ばした問題もそのまま遊べ、解いてもクリア数は変わらない", async () => {
		const { token } = await seedStudent();
		await call("POST", "/me/tutorials/skip", token, { to: 4 });

		const res = await call("POST", "/me/tutorials/2/attempts", token, {
			program: TUTORIAL_2_SOLUTION,
		});

		expect(res.status).toBe(201);
		expect(((await res.json()) as { outcome: string }).outcome).toBe("goal");
		expect(await clearedCountOf(token)).toBe(3);
	});

	it("飛ばした問題を遊んでも、今の問題の結果は変わらない", async () => {
		const { token, studentId } = await seedStudent();
		await call("POST", "/me/tutorials/skip", token, { to: 4 });

		await call("POST", "/me/tutorials/2/attempts", token, { program: [forward] });

		expect((await statusOf(studentId)).lastResult).toBe("notSent");
	});

	it("今の問題で失敗したら、今の問題の結果は失敗", async () => {
		const { token, studentId } = await seedStudent();
		await call("POST", "/me/tutorials/skip", token, { to: 4 });

		await call("POST", "/me/tutorials/4/attempts", token, { program: [forward] });

		expect(await statusOf(studentId)).toEqual({
			studentId,
			name: "たろう",
			clearedCount: 3,
			lastResult: "failed",
		});
	});

	it("全部飛ばした後の今の問題は、最後に送った自分の迷路", async () => {
		const { token, studentId } = await seedStudent();
		await call("POST", "/me/tutorials/skip", token, { to: TUTORIALS.length + 1 });
		const created = await call("POST", "/me/mazes", token, { name: "めいろ", data: MAZE });
		const { mazeId } = (await created.json()) as { mazeId: string };

		const before = await statusOf(studentId);
		await call("POST", `/me/mazes/${mazeId}/attempts`, token, {
			program: [forward, forward, forward, forward],
		});
		const after = await statusOf(studentId);

		expect(before).toEqual({
			studentId,
			name: "たろう",
			clearedCount: TUTORIALS.length,
			lastResult: "notSent",
		});
		expect(after.lastResult).toBe("succeeded");
	});
});
