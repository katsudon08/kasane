/*
 * 画面の移り先。授業で使うモードは/の下、自由モードは/freeの下（仕様書free-mode.mdの「画面遷移」）
 * Link・Navigate・navigateにそのまま広げて渡せる形で返す
 */
import { linkOptions } from "@tanstack/react-router";

import { useStudentMode } from "./student-mode";
import type { StudentMode } from "./student-mode";

const lessonPaths = {
	home: () => linkOptions({ to: "/" }),
	tutorial: (no: number) => linkOptions({ to: "/tutorials/$no", params: { no: String(no) } }),
	tutorialPlay: (no: number) =>
		linkOptions({ to: "/tutorials/$no/play", params: { no: String(no) } }),
	mazeNew: () => linkOptions({ to: "/mazes/new" }),
	mazeImport: () => linkOptions({ to: "/mazes/import" }),
	maze: (mazeId: string) => linkOptions({ to: "/mazes/$mazeId", params: { mazeId } }),
	mazePlay: (mazeId: string) => linkOptions({ to: "/mazes/$mazeId/play", params: { mazeId } }),
	mazeEdit: (mazeId: string) => linkOptions({ to: "/mazes/$mazeId/edit", params: { mazeId } }),
};

const freePaths = {
	home: () => linkOptions({ to: "/free" }),
	tutorial: (no: number) => linkOptions({ to: "/free/tutorials/$no", params: { no: String(no) } }),
	tutorialPlay: (no: number) =>
		linkOptions({ to: "/free/tutorials/$no/play", params: { no: String(no) } }),
	mazeNew: () => linkOptions({ to: "/free/mazes/new" }),
	mazeImport: () => linkOptions({ to: "/free/mazes/import" }),
	maze: (mazeId: string) => linkOptions({ to: "/free/mazes/$mazeId", params: { mazeId } }),
	mazePlay: (mazeId: string) => linkOptions({ to: "/free/mazes/$mazeId/play", params: { mazeId } }),
	mazeEdit: (mazeId: string) => linkOptions({ to: "/free/mazes/$mazeId/edit", params: { mazeId } }),
};

export function pathsOf(mode: StudentMode) {
	return mode === "free" ? freePaths : lessonPaths;
}

export function usePaths() {
	return pathsOf(useStudentMode());
}
