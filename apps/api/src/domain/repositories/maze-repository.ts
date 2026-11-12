import type { MazeContent, OwnMaze } from "../entities/maze";

// 迷路のIDを使う操作は、必ず本人（児童）のIDも条件に入れる
export interface MazeRepository {
	// その児童の迷路を、変えた時刻が新しい順（同じなら迷路のID順）に返す
	findByStudent(studentId: string): Promise<OwnMaze[]>;
	// その児童の迷路を引く。他の児童の迷路・存在しない迷路はnull
	findByIdAndStudent(mazeId: string, studentId: string): Promise<OwnMaze | null>;
	// 迷路を作り、迷路のIDを返す
	create(studentId: string, content: MazeContent): Promise<string>;
	// その児童の迷路の名前と中身を置き換え、変えた時刻を今の時刻にする。置き換えたらtrue
	replace(mazeId: string, studentId: string, content: MazeContent): Promise<boolean>;
	// その児童の迷路を消す。消したらtrue
	delete(mazeId: string, studentId: string): Promise<boolean>;
}
