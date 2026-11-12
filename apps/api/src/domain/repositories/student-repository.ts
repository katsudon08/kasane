import type { StudentStatus } from "../entities/student-status";

export interface StudentRepository {
	// トークンのハッシュだけを持つ児童の行を作り、児童のIDを返す。その授業の児童の数が上限に達していれば、作らずにnull
	create(student: { lessonId: string; name: string; tokenHash: string }): Promise<string | null>;
	// 児童の名前を返す。本人を特定した後に呼ぶので、行がなければ呼び出し側の誤りとして例外にする
	findName(studentId: string): Promise<string>;
	// 教師に見せるその児童の状態を、挑戦の記録から求める。行がなければ呼び出し側の誤りとして例外にする
	findStatus(studentId: string): Promise<StudentStatus>;
	// 教師に見せるその教師の授業の全児童の状態を、1回のクエリで求める。他の教師の授業なら空
	findStatusesByLesson(lessonId: string, teacherId: string): Promise<StudentStatus[]>;
}
