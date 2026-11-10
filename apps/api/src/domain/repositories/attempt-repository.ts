import type { NewAttempt } from "../entities/attempt";

export interface AttemptRepository {
	// 挑戦の記録を追加する（追加だけで、更新しない）
	create(attempt: NewAttempt): Promise<void>;
	// クリア数。成功した記録にあるチュートリアルの種類の数
	countClearedTutorials(studentId: string): Promise<number>;
}
