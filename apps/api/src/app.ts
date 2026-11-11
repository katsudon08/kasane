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
import { notifyStudentStatusUseCase } from "./application/usecases/notify-student-status";
import { registerTeacherUseCase } from "./application/usecases/register-teacher";
import { replaceMazeUseCase } from "./application/usecases/replace-maze";
import { watchLessonAsStudentUseCase } from "./application/usecases/watch-lesson-as-student";
import { watchLessonAsTeacherUseCase } from "./application/usecases/watch-lesson-as-teacher";
import { env } from "./config/env";
import { createLessonHub } from "./domain/services/lesson-hub";
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

// 本文の大きさの上限。正しい本文は最大でも約4KB（命令100個のプログラム）なので、その4倍の16KB
const MAX_REQUEST_BODY_BYTES = 16 * 1024;

/*
 * SSEで空の知らせを送る間隔。無通信の接続は切られるので、仕様書の決まりどおり10秒未満にする
 * 実機確認（GIGA端末と学校のネットワーク）で、接続が切れずに続いた間隔
 */
export const PING_INTERVAL_MS = 5000;

type AppDeps = {
	db: NodePgDatabase;
	// テストでは、空の知らせを待つ時間を短くする
	pingIntervalMs?: number;
	// SSEの接続が、授業が終わったかを確かめるのに使う今の時刻。テストでは、終わる時刻を待たずに進める
	now?: () => Date;
};

export const createApp = ({
	db,
	pingIntervalMs = PING_INTERVAL_MS,
	now = () => new Date(),
}: AppDeps) => {
	const identityRepository = createIdentityRepository(db);
	const teacherRepository = createTeacherRepository(db);
	const lessonRepository = createLessonRepository(db);
	const studentRepository = createStudentRepository(db);
	const mazeRepository = createMazeRepository(db);
	const attemptRepository = createAttemptRepository(db);

	// 授業ごとの送り先。このプロセスのメモリにしかないので、サーバーは1台で動かす
	const lessonHub = createLessonHub();
	const notifyStudentStatus = notifyStudentStatusUseCase({ studentRepository, lessonHub });

	const auth = createAuth({
		identifyTeacher: identifyTeacherUseCase({ identityRepository }),
		identifyStudent: identifyStudentUseCase({ identityRepository }),
	});

	return (
		// 知らない項目を黙って取り除く機能（normalize）は使わない。入力はスキーマで落とし、応答はハンドラが項目を選んで組む
		// 上限を超える本文は、サーバーが読み込む前に413で返す（本人の特定や検証より先）
		new Elysia({ normalize: false, serve: { maxRequestBodySize: MAX_REQUEST_BODY_BYTES } })
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
					closeLesson: closeLessonUseCase({ lessonRepository, lessonHub }),
					watchLessonAsTeacher: watchLessonAsTeacherUseCase({
						lessonRepository,
						studentRepository,
						lessonHub,
						pingIntervalMs,
						now,
					}),
				}),
			)
			.use(
				studentController({
					auth,
					joinLesson: joinLessonUseCase({
						lessonRepository,
						studentRepository,
						notifyStudentStatus,
					}),
					getMe: getMeUseCase({ studentRepository, attemptRepository }),
					attemptTutorial: attemptTutorialUseCase({ attemptRepository, notifyStudentStatus }),
					attemptMaze: attemptMazeUseCase({
						mazeRepository,
						attemptRepository,
						notifyStudentStatus,
					}),
					listMazes: listMazesUseCase({ mazeRepository }),
					createMaze: createMazeUseCase({ mazeRepository, attemptRepository }),
					replaceMaze: replaceMazeUseCase({ mazeRepository, attemptRepository }),
					deleteMaze: deleteMazeUseCase({ mazeRepository }),
					watchLessonAsStudent: watchLessonAsStudentUseCase({
						lessonHub,
						pingIntervalMs,
						now,
					}),
				}),
			)
			.get("/health", () => "OK")
	);
};
