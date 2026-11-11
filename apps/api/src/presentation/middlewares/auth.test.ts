/*
 * トークンから本人を特定するmacro（仕様書backend.mdの「トークン」「エラーの応答」「アクセス制御」）
 */
import { beforeEach, describe, expect, it, mock } from "bun:test";

import { sql } from "drizzle-orm";
import { Elysia } from "elysia";

import { identifyStudentUseCase } from "../../application/usecases/identify-student";
import { identifyTeacherUseCase } from "../../application/usecases/identify-teacher";
import { generateToken, hashToken } from "../../domain/services/token";
// pnpm testではdotenvで.env.test.localが読み込まれるため、テスト用DBに接続する
import { db } from "../../infrastructure/database/drizzle";
import { attempts, lessons, mazes, students, teachers } from "../../infrastructure/database/schema";
import { identityRepository } from "../../infrastructure/repositories/identity-repository";
import { auth, parseBearerToken } from "./auth";
import { errorHandler } from "./error-handler";

// 形は正しい（43文字のbase64url）トークン
const TEACHER_TOKEN = "T".repeat(43);
const STUDENT_TOKEN = "S".repeat(43);
const UNKNOWN_TOKEN = "U".repeat(43);

const LESSON_ENDS_AT = new Date("2999-12-31T00:00:00.000Z");

const UNAUTHORIZED_BODY = { code: "unauthorized" };

const identifyTeacher = mock(async (token: string) =>
	token === TEACHER_TOKEN ? { teacherId: "teacher-id" } : null,
);

const identifyStudent = mock(async (token: string) =>
	token === STUDENT_TOKEN
		? { studentId: "student-id", lessonId: "lesson-id", lessonEndsAt: LESSON_ENDS_AT }
		: null,
);

// index.tsと同じく、errorHandlerを入れたアプリにmacroを足し、ルートで`teacher`・`student`を付ける
const app = new Elysia()
	.use(errorHandler)
	.use(auth({ identifyTeacher, identifyStudent }))
	.get("/teacher", ({ teacherId }) => ({ teacherId }), { teacher: true })
	.get(
		"/student",
		({ studentId, lessonId, lessonEndsAt }) => ({ studentId, lessonId, lessonEndsAt }),
		{ student: true },
	)
	.get("/open", () => ({ open: true }));

type Handler = { handle: (request: Request) => Promise<Response> };

const get = (target: Handler, path: string, authorization?: string) =>
	target.handle(
		new Request(`http://localhost${path}`, {
			headers: authorization === undefined ? undefined : { authorization },
		}),
	);

// トークンがない・正しくないAuthorizationヘッダー
const REJECTED_HEADERS = [
	{ name: "ヘッダーがない", authorization: undefined },
	{ name: "Bearerではない", authorization: `Basic ${TEACHER_TOKEN}` },
	{ name: "Bearerが付いていない", authorization: TEACHER_TOKEN },
	{ name: "トークンが空", authorization: "Bearer " },
	{ name: "トークンが42文字", authorization: `Bearer ${"T".repeat(42)}` },
	{ name: "トークンが44文字", authorization: `Bearer ${"T".repeat(44)}` },
	{ name: "base64urlにない文字を含む", authorization: `Bearer ${"+".repeat(43)}` },
	{ name: "どの行にも当たらないトークン", authorization: `Bearer ${UNKNOWN_TOKEN}` },
];

describe("parseBearerToken", () => {
	it.each([
		{ name: "Bearerに続く43文字のbase64url", authorization: `Bearer ${TEACHER_TOKEN}` },
		{ name: "スキームは大文字と小文字を区別しない", authorization: `bearer ${TEACHER_TOKEN}` },
	])("$name: トークンを返す", ({ authorization }) => {
		expect(parseBearerToken(authorization)).toBe(TEACHER_TOKEN);
	});

	it("base64urlの記号（-と_）を含むトークンを返す", () => {
		const token = `${"a".repeat(41)}-_`;

		expect(parseBearerToken(`Bearer ${token}`)).toBe(token);
	});

	it.each([
		{ name: "undefined", authorization: undefined },
		{ name: "空文字", authorization: "" },
		{ name: "Bearerではない", authorization: `Basic ${TEACHER_TOKEN}` },
		{ name: "Bearerが付いていない", authorization: TEACHER_TOKEN },
		{ name: "トークンが空", authorization: "Bearer " },
		{ name: "トークンが42文字", authorization: `Bearer ${"T".repeat(42)}` },
		{ name: "トークンが44文字", authorization: `Bearer ${"T".repeat(44)}` },
		{ name: "空白が2つ", authorization: `Bearer  ${TEACHER_TOKEN}` },
		{ name: "base64urlにない文字を含む", authorization: `Bearer ${"+".repeat(43)}` },
	])("$name: nullを返す", ({ authorization }) => {
		expect(parseBearerToken(authorization)).toBeNull();
	});
});

describe("auth", () => {
	beforeEach(() => {
		identifyTeacher.mockClear();
		identifyStudent.mockClear();
	});

	describe("teacher: trueを付けたルート", () => {
		it("教師のトークンなら、特定した教師のIDがハンドラに渡る", async () => {
			const res = await get(app, "/teacher", `Bearer ${TEACHER_TOKEN}`);

			expect(res.status).toBe(200);
			expect(await res.json()).toEqual({ teacherId: "teacher-id" });
			expect(identifyTeacher).toHaveBeenCalledTimes(1);
			expect(identifyTeacher).toHaveBeenCalledWith(TEACHER_TOKEN);
		});

		it("応答にCache-Control: no-storeを付ける", async () => {
			const res = await get(app, "/teacher", `Bearer ${TEACHER_TOKEN}`);

			expect(res.headers.get("cache-control")).toBe("no-store");
		});

		it.each(REJECTED_HEADERS)(
			"$name: 401とWWW-Authenticate: Bearerを返す",
			async ({ authorization }) => {
				const res = await get(app, "/teacher", authorization);

				expect(res.status).toBe(401);
				expect(res.headers.get("www-authenticate")).toBe("Bearer");
				expect(res.headers.get("cache-control")).toBe("no-store");
				expect(await res.json()).toEqual(UNAUTHORIZED_BODY);
			},
		);

		it("児童のトークンでは401を返す", async () => {
			const res = await get(app, "/teacher", `Bearer ${STUDENT_TOKEN}`);

			expect(res.status).toBe(401);
			expect(await res.json()).toEqual(UNAUTHORIZED_BODY);
			expect(identifyStudent).not.toHaveBeenCalled();
		});

		it("形が違うトークンでは、教師を引かない", async () => {
			await get(app, "/teacher", `Bearer ${"T".repeat(42)}`);

			expect(identifyTeacher).not.toHaveBeenCalled();
		});
	});

	describe("student: trueを付けたルート", () => {
		it("児童のトークンなら、特定した児童のIDと授業のIDと終わる時刻がハンドラに渡る", async () => {
			const res = await get(app, "/student", `Bearer ${STUDENT_TOKEN}`);

			expect(res.status).toBe(200);
			expect(await res.json()).toEqual({
				studentId: "student-id",
				lessonId: "lesson-id",
				lessonEndsAt: LESSON_ENDS_AT.toISOString(),
			});
			expect(identifyStudent).toHaveBeenCalledTimes(1);
			expect(identifyStudent).toHaveBeenCalledWith(STUDENT_TOKEN);
		});

		it("応答にCache-Control: no-storeを付ける", async () => {
			const res = await get(app, "/student", `Bearer ${STUDENT_TOKEN}`);

			expect(res.headers.get("cache-control")).toBe("no-store");
		});

		it.each(REJECTED_HEADERS)(
			"$name: 401とWWW-Authenticate: Bearerを返す",
			async ({ authorization }) => {
				const res = await get(app, "/student", authorization);

				expect(res.status).toBe(401);
				expect(res.headers.get("www-authenticate")).toBe("Bearer");
				expect(res.headers.get("cache-control")).toBe("no-store");
				expect(await res.json()).toEqual(UNAUTHORIZED_BODY);
			},
		);

		it("教師のトークンでは401を返す", async () => {
			const res = await get(app, "/student", `Bearer ${TEACHER_TOKEN}`);

			expect(res.status).toBe(401);
			expect(await res.json()).toEqual(UNAUTHORIZED_BODY);
			expect(identifyTeacher).not.toHaveBeenCalled();
		});

		it("形が違うトークンでは、児童を引かない", async () => {
			await get(app, "/student", `Bearer ${"S".repeat(42)}`);

			expect(identifyStudent).not.toHaveBeenCalled();
		});
	});

	describe("teacherもstudentも付けないルート", () => {
		it("トークンがなくても通り、本人を引かない", async () => {
			const res = await get(app, "/open");

			expect(res.status).toBe(200);
			expect(await res.json()).toEqual({ open: true });
			expect(res.headers.get("www-authenticate")).toBeNull();
			expect(identifyTeacher).not.toHaveBeenCalled();
			expect(identifyStudent).not.toHaveBeenCalled();
		});
	});
});

describe("auth（発行したトークンとテスト用DBを組み合わせる）", () => {
	const repository = identityRepository(db);

	const appWithDatabase = new Elysia()
		.use(errorHandler)
		.use(
			auth({
				identifyTeacher: identifyTeacherUseCase({ identityRepository: repository }),
				identifyStudent: identifyStudentUseCase({ identityRepository: repository }),
			}),
		)
		.get("/teacher", ({ teacherId }) => ({ teacherId }), { teacher: true })
		.get(
			"/student",
			({ studentId, lessonId, lessonEndsAt }) => ({ studentId, lessonId, lessonEndsAt }),
			{ student: true },
		);

	const only = <Row>(rows: Row[]): Row => {
		const [row] = rows;
		if (!row) throw new Error("RETURNINGで行が返されませんでした");
		return row;
	};

	// 教師1人・授業1つ・児童1人を作り、それぞれのトークン（DBにはハッシュだけを入れる）を返す
	const seed = async () => {
		const teacherToken = generateToken();
		const studentToken = generateToken();
		const teacher = only(
			await db
				.insert(teachers)
				.values({ tokenHash: hashToken(teacherToken) })
				.returning(),
		);
		const lesson = only(
			await db
				.insert(lessons)
				.values({ teacherId: teacher.id, endsAt: LESSON_ENDS_AT })
				.returning(),
		);
		const student = only(
			await db
				.insert(students)
				.values({ lessonId: lesson.id, name: "たろう", tokenHash: hashToken(studentToken) })
				.returning(),
		);
		return { teacherToken, studentToken, teacher, lesson, student };
	};

	beforeEach(async () => {
		await db.execute(
			sql`truncate table ${attempts}, ${mazes}, ${students}, ${lessons}, ${teachers}`,
		);
	});

	it("教師のトークンで、その教師が特定される", async () => {
		const { teacherToken, teacher } = await seed();

		const res = await get(appWithDatabase, "/teacher", `Bearer ${teacherToken}`);

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ teacherId: teacher.id });
	});

	it("児童のトークンで、その児童と授業が特定される", async () => {
		const { studentToken, student, lesson } = await seed();

		const res = await get(appWithDatabase, "/student", `Bearer ${studentToken}`);

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			studentId: student.id,
			lessonId: lesson.id,
			lessonEndsAt: LESSON_ENDS_AT.toISOString(),
		});
	});

	it("児童のトークンで教師用は使えず、教師のトークンで児童用は使えない", async () => {
		const { teacherToken, studentToken } = await seed();

		const teacherRoute = await get(appWithDatabase, "/teacher", `Bearer ${studentToken}`);
		const studentRoute = await get(appWithDatabase, "/student", `Bearer ${teacherToken}`);

		expect(teacherRoute.status).toBe(401);
		expect(studentRoute.status).toBe(401);
	});

	it("発行していないトークンでは401を返す", async () => {
		await seed();

		const res = await get(appWithDatabase, "/teacher", `Bearer ${generateToken()}`);

		expect(res.status).toBe(401);
		expect(await res.json()).toEqual(UNAUTHORIZED_BODY);
	});

	it("トークンのハッシュをそのまま送っても401を返す（ハッシュが漏れてもトークンにはならない）", async () => {
		const { teacherToken } = await seed();

		const res = await get(appWithDatabase, "/teacher", `Bearer ${hashToken(teacherToken)}`);

		expect(res.status).toBe(401);
	});
});
