/*
 * 児童用のHTTPのAPI（仕様書backend.mdの「HTTPのAPI」の児童用）
 * トークンが要らないのは、本人の行を作るPOST /studentsだけ
 */
import { isLessonEnded } from "@kasane/core";
import { Elysia, status, t } from "elysia";

import type { AttemptMaze } from "../../application/usecases/attempt-maze";
import type { AttemptTutorial } from "../../application/usecases/attempt-tutorial";
import type { CreateMaze } from "../../application/usecases/create-maze";
import type { DeleteMaze } from "../../application/usecases/delete-maze";
import type { GetMe } from "../../application/usecases/get-me";
import type { JoinLesson } from "../../application/usecases/join-lesson";
import type { ListMazes } from "../../application/usecases/list-mazes";
import type { ReplaceMaze } from "../../application/usecases/replace-maze";
import type { WatchLessonAsStudent } from "../../application/usecases/watch-lesson-as-student";
import { failure } from "../failure";
import type { Auth } from "../middlewares/auth";
import {
	attemptInput,
	compileResultBody,
	invalidInputBody,
	joinLessonInput,
	lessonEndedBody,
	mazeIdBody,
	mazeInput,
	mazeLockedBody,
	mazeParams,
	mazesBody,
	meBody,
	notFoundBody,
	tokenBody,
	tutorialLockedBody,
	tutorialParams,
} from "../schemas";
import { toSse } from "../sse";

type StudentControllerDeps = {
	auth: Auth;
	joinLesson: JoinLesson;
	getMe: GetMe;
	attemptTutorial: AttemptTutorial;
	attemptMaze: AttemptMaze;
	listMazes: ListMazes;
	createMaze: CreateMaze;
	replaceMaze: ReplaceMaze;
	deleteMaze: DeleteMaze;
	watchLessonAsStudent: WatchLessonAsStudent;
};

// 名前と迷路の名前は、前後の空白を削ってから検証する（Elysiaのtransformは検証の前に走る）
const trimName = ({ body }: { body: unknown }) => {
	if (typeof body !== "object" || body === null || !("name" in body)) return;
	if (typeof body.name !== "string") return;

	body.name = body.name.trim();
};

export const studentController = ({
	auth,
	joinLesson,
	getMe,
	attemptTutorial,
	attemptMaze,
	listMazes,
	createMaze,
	replaceMaze,
	deleteMaze,
	watchLessonAsStudent,
}: StudentControllerDeps) =>
	new Elysia()
		.use(auth)
		// まだ本人を特定できないので、授業は本文のlessonIdで受け取る
		.post(
			"/students",
			async ({ body }) => {
				const result = await joinLesson({ ...body, now: new Date() });
				if (!result.ok) return failure(result.reason);

				return status(201, { token: result.token });
			},
			{
				transform: trimName,
				body: joinLessonInput,
				response: { 201: tokenBody, 404: notFoundBody, 410: lessonEndedBody },
			},
		)
		.guard({ student: true }, (app) =>
			app
				// 児童のトークンで呼ぶ口は、授業が終わっていれば410。本人の特定（macro）の後に、ここ一か所で確かめる
				.onBeforeHandle(({ lessonEndsAt }) => {
					if (isLessonEnded({ endsAt: lessonEndsAt }, new Date())) return failure("lessonEnded");
				})
				.get("/me", async ({ studentId }) => getMe({ studentId }), {
					response: { 200: meBody, 410: lessonEndedBody },
				})
				.post(
					"/me/tutorials/:no/attempts",
					async ({ studentId, lessonId, params, body }) => {
						const result = await attemptTutorial({
							studentId,
							lessonId,
							no: params.no,
							program: body.program,
						});
						if (!result.ok) return failure(result.reason);

						return status(201, result.result);
					},
					{
						params: tutorialParams,
						body: attemptInput,
						response: {
							201: compileResultBody,
							403: tutorialLockedBody,
							410: lessonEndedBody,
							422: invalidInputBody,
						},
					},
				)
				.post(
					"/me/mazes/:mazeId/attempts",
					async ({ studentId, lessonId, params, body }) => {
						const result = await attemptMaze({
							studentId,
							lessonId,
							mazeId: params.mazeId,
							program: body.program,
						});
						if (!result.ok) return failure(result.reason);

						return status(201, result.result);
					},
					{
						params: mazeParams,
						body: attemptInput,
						response: {
							201: compileResultBody,
							404: notFoundBody,
							410: lessonEndedBody,
							422: invalidInputBody,
						},
					},
				)
				.get(
					"/me/mazes",
					async ({ studentId }) => {
						const mazes = await listMazes({ studentId });

						return mazes.map(({ mazeId, name, data, updatedAt }) => ({
							mazeId,
							name,
							data,
							updatedAt: updatedAt.toISOString(),
						}));
					},
					{ response: { 200: mazesBody, 410: lessonEndedBody } },
				)
				.post(
					"/me/mazes",
					async ({ studentId, body }) => {
						// 保存する項目を選んで渡す（本文をそのまま渡さない）
						const result = await createMaze({
							studentId,
							content: { name: body.name, data: body.data },
						});
						if (!result.ok) return failure(result.reason);

						return status(201, { mazeId: result.mazeId });
					},
					{
						transform: trimName,
						body: mazeInput,
						response: {
							201: mazeIdBody,
							403: mazeLockedBody,
							410: lessonEndedBody,
							422: invalidInputBody,
						},
					},
				)
				.put(
					"/me/mazes/:mazeId",
					async ({ studentId, params, body }) => {
						const result = await replaceMaze({
							studentId,
							mazeId: params.mazeId,
							content: { name: body.name, data: body.data },
						});
						if (!result.ok) return failure(result.reason);

						return status(204);
					},
					{
						transform: trimName,
						params: mazeParams,
						body: mazeInput,
						response: {
							204: t.Void(),
							403: mazeLockedBody,
							404: notFoundBody,
							410: lessonEndedBody,
							422: invalidInputBody,
						},
					},
				)
				.delete(
					"/me/mazes/:mazeId",
					async ({ studentId, params }) => {
						const result = await deleteMaze({ studentId, mazeId: params.mazeId });
						if (!result.ok) return failure(result.reason);

						return status(204);
					},
					{
						params: mazeParams,
						response: { 204: t.Void(), 404: notFoundBody, 410: lessonEndedBody },
					},
				)
				// サーバーからの知らせ（SSE）の、児童用の受け取り口。児童はトークンから授業が引けるので、パスにIDを持たない
				.get(
					"/me/events",
					({ lessonId, lessonEndsAt }) => toSse(watchLessonAsStudent({ lessonId, lessonEndsAt })),
					// 200には応答スキーマを付けない（付けると、クライアントが知らせを1件ずつ受け取る型にならない）
					{ response: { 410: lessonEndedBody } },
				),
		);
