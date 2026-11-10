/*
 * 教師用のHTTPのAPI（仕様書backend.mdの「HTTPのAPI」の教師用）
 * トークンが要らないのは、本人の行を作るPOST /teachersだけ
 */
import { Elysia, status, t } from "elysia";

import type { CloseLesson } from "../../application/usecases/close-lesson";
import type { CreateLesson } from "../../application/usecases/create-lesson";
import type { GetLesson } from "../../application/usecases/get-lesson";
import type { ListOpenLessons } from "../../application/usecases/list-open-lessons";
import type { RegisterTeacher } from "../../application/usecases/register-teacher";
import { failure } from "../failure";
import type { Auth } from "../middlewares/auth";
import {
	lessonBody,
	lessonEndedBody,
	lessonIdBody,
	lessonParams,
	notFoundBody,
	openLessonsBody,
	tokenBody,
} from "../schemas";

type TeacherControllerDeps = {
	auth: Auth;
	registerTeacher: RegisterTeacher;
	createLesson: CreateLesson;
	listOpenLessons: ListOpenLessons;
	getLesson: GetLesson;
	closeLesson: CloseLesson;
};

export const teacherController = ({
	auth,
	registerTeacher,
	createLesson,
	listOpenLessons,
	getLesson,
	closeLesson,
}: TeacherControllerDeps) =>
	new Elysia()
		.use(auth)
		.post("/teachers", async () => status(201, await registerTeacher()), {
			response: { 201: tokenBody },
		})
		.post(
			"/lessons",
			async ({ teacherId }) => status(201, await createLesson({ teacherId, now: new Date() })),
			{ teacher: true, response: { 201: lessonIdBody } },
		)
		.get(
			"/lessons",
			async ({ teacherId }) => {
				const lessons = await listOpenLessons({ teacherId, now: new Date() });

				return lessons.map(({ lessonId, createdAt, studentCount }) => ({
					lessonId,
					createdAt: createdAt.toISOString(),
					studentCount,
				}));
			},
			{ teacher: true, response: { 200: openLessonsBody } },
		)
		.get(
			"/lessons/:lessonId",
			async ({ teacherId, params }) => {
				const result = await getLesson({
					teacherId,
					lessonId: params.lessonId,
					now: new Date(),
				});
				if (!result.ok) return failure(result.reason);

				return { createdAt: result.lesson.createdAt.toISOString() };
			},
			{
				teacher: true,
				params: lessonParams,
				response: { 200: lessonBody, 404: notFoundBody, 410: lessonEndedBody },
			},
		)
		.post(
			"/lessons/:lessonId/close",
			async ({ teacherId, params }) => {
				const result = await closeLesson({
					teacherId,
					lessonId: params.lessonId,
					now: new Date(),
				});
				if (!result.ok) return failure(result.reason);

				return status(204);
			},
			{
				teacher: true,
				params: lessonParams,
				response: { 204: t.Void(), 404: notFoundBody, 410: lessonEndedBody },
			},
		);
