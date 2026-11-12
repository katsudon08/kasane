export {
	MAX_LAYERS,
	addLayer,
	createMaze,
	placeCell,
	removeTopLayer,
	rotateStart,
} from "./lib/maze-edit";
export type { EditError, EditResult, MazeSize } from "./lib/maze-edit";
export { defaultMazeName } from "./lib/maze-name";
export { tapCell } from "./lib/tap-cell";
export { EditErrorText } from "./ui/EditErrorText";
export { ToolPalette } from "./ui/ToolPalette";
