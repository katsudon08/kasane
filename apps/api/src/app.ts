/*
 * 依存の組み立て。サーバーの起動（index.ts）と、app.handle()で呼ぶテストの両方がここを通る
 */
import { cors } from "@elysia/cors";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Elysia } from "elysia";

import { attemptMazeUseCase } from "./application/usecases/attempt-maze";
import { attemptTutorialUseCase } from "./application/usecases/attempt-tutorial";
import { closeLessonUseCase } from "./application/usecases/close-lesson";
import { createLessonUseCase } from "./application/usecases/create-lesson";
import { createMazeUseCase } from "./application/usecases/create-maze";
import { deleteMazeUseCase } from "./application/usecases/delete-maze";
import { getLessonUseCase } from "./application/usecases/get-lesson";
import { getMeUseCase } from "./application/usecases/get-me";
import { identifyStudentUseCase } from "./application/usecases/identify-student";
import { identifyTeacherUseCase } from "./application/usecases/identify-teacher";
import { joinLessonUseCase } from "./application/usecases/join-lesson";
import { listMazesUseCase } from "./application/usecases/list-mazes";
import { listOpenLessonsUseCase } from "./application/usecases/list-open-lessons";
import { registerTeacherUseCase } from "./application/usecases/register-teacher";
import { replaceMazeUseCase } from "./application/usecases/replace-maze";
import { env } from "./config/env";
import { attemptRepository as createAttemptRepository } from "./infrastructure/repositories/attempt-repository";
import { identityRepository as createIdentityRepository } from "./infrastructure/repositories/identity-repository";
import { lessonRepository as createLessonRepository } from "./infrastructure/repositories/lesson-repository";
import { mazeRepository as createMazeRepository } from "./infrastructure/repositories/maze-repository";
import { studentRepository as createStudentRepository } from "./infrastructure/repositories/student-repository";
import { teacherRepository as createTeacherRepository } from "./infrastructure/repositories/teacher-repository";
import { studentController } from "./presentation/controllers/student";
import { teacherController } from "./presentation/controllers/teacher";
import { auth as createAuth } from "./presentation/middlewares/auth";
import { errorHandler } from "./presentation/middlewares/error-handler";

type AppDeps = {
	db: NodePgDatabase;
};

export const createApp = ({ db }: AppDeps) => {
	const identityRepository = createIdentityRepository(db);
	const teacherRepository = createTeacherRepository(db);
	const lessonRepository = createLessonRepository(db);
	const studentRepository = createStudentRepository(db);
	const mazeRepository = createMazeRepository(db);
	const attemptRepository = createAttemptRepository(db);

	const auth = createAuth({
		identifyTeacher: identifyTeacherUseCase({ identityRepository }),
		identifyStudent: identifyStudentUseCase({ identityRepository }),
	});

	return (
		// 知らない項目を黙って取り除く機能（normalize）は使わない。入力はスキーマで落とし、応答はハンドラが項目を選んで組む
		new Elysia({ normalize: false })
			// 教師アプリと児童アプリの二つのオリジンだけを許可する
			.use(cors({ origin: [env.TEACHER_ORIGIN, env.STUDENT_ORIGIN] }))
			.use(errorHandler)
			.use(
				teacherController({
					auth,
					registerTeacher: registerTeacherUseCase({ teacherRepository }),
					createLesson: createLessonUseCase({ lessonRepository }),
					listOpenLessons: listOpenLessonsUseCase({ lessonRepository }),
					getLesson: getLessonUseCase({ lessonRepository }),
					closeLesson: closeLessonUseCase({ lessonRepository }),
				}),
			)
			.use(
				studentController({
					auth,
					joinLesson: joinLessonUseCase({ lessonRepository, studentRepository }),
					getMe: getMeUseCase({ studentRepository, attemptRepository }),
					attemptTutorial: attemptTutorialUseCase({ attemptRepository }),
					attemptMaze: attemptMazeUseCase({ mazeRepository, attemptRepository }),
					listMazes: listMazesUseCase({ mazeRepository }),
					createMaze: createMazeUseCase({ mazeRepository, attemptRepository }),
					replaceMaze: replaceMazeUseCase({ mazeRepository, attemptRepository }),
					deleteMaze: deleteMazeUseCase({ mazeRepository }),
				}),
			)
			.get("/health", () => "OK")
	);
};
