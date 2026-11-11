import type { StudentRepository } from "../../domain/repositories/student-repository";
import type { LessonHub } from "../../domain/services/lesson-hub";

type NotifyStudentStatusDeps = {
	studentRepository: StudentRepository;
	lessonHub: Pick<LessonHub, "hasTeachers" | "sendStudentStatus">;
};

/*
 * その授業を開いている教師に、児童の状態を送る。児童の行や挑戦の記録を入れた後に呼ぶ
 * 状態はDBから求め直すので、教師に届く状態は必ずDBと一致する
 */
export const notifyStudentStatusUseCase =
	({ studentRepository, lessonHub }: NotifyStudentStatusDeps) =>
	async ({ lessonId, studentId }: { lessonId: string; studentId: string }): Promise<void> => {
		// 送り先がない（教師が開いていない）ときは何もしない
		if (!lessonHub.hasTeachers(lessonId)) return;

		try {
			const status = await studentRepository.findStatus(studentId);
			lessonHub.sendStudentStatus(lessonId, status);
		} catch (error) {
			// 送れなくても児童への応答は変えない（教師の画面は、次につないだときの全児童の状態で追いつく）
			console.error("教師に児童の状態を送れませんでした", error);
		}
	};

export type NotifyStudentStatus = ReturnType<typeof notifyStudentStatusUseCase>;
