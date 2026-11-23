/*
 * 授業で使うモードと自由モードのどちらの画面かを、レイアウトから画面へ伝える（仕様書free-mode.md）
 * 画面は同じ部品を使い、記録の読み書きの先と移り先だけをモードで切り替える
 * 既定のモードは置かない。伝え忘れた画面が黙ってAPIと通信しないよう、レイアウトの外で使ったら例外にする
 */
import { createContext, useContext } from "react";
import type { ReactNode } from "react";

export type StudentMode = "lesson" | "free";

const StudentModeContext = createContext<StudentMode | null>(null);

export function StudentModeProvider({
	mode,
	children,
}: {
	mode: StudentMode;
	children: ReactNode;
}) {
	return <StudentModeContext value={mode}>{children}</StudentModeContext>;
}

export function useStudentMode(): StudentMode {
	const mode = useContext(StudentModeContext);
	if (mode === null) throw new Error("StudentModeProviderの外でモードを使った");
	return mode;
}

/*
 * TanStack Queryの問い合わせと書き込みを、ネットにつながっていないときにも始めるか
 * 自由モードは端末の中だけで読み書きするので、つながっていなくても始める（free-mode.mdの「フロントエンド」）
 */
export function networkModeOf(mode: StudentMode): "online" | "always" {
	return mode === "free" ? "always" : "online";
}
