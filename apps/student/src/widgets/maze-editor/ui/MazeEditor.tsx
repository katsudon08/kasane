/*
 * めいろをつくる / 変える（仕様書README.mdの「めいろをつくる / 変える」）
 * - 見出しは他の画面と同じく、「もどる」の矢印と画面の名前
 * - 左半分に、階の切り替えと足す・減らす・今見ている階のマス目・置けないときの理由
 * - 右半分の上から、「迷路の名前」の入力欄と大きさ（新しく作るときだけ）を一列に、その下に道具のパレット、いちばん下に主ボタン「できあがり」
 *   どれも見出しを上に置く
 * 編集中の迷路は端末のメモリだけに持ち、「できあがり」を押すまでサーバーへ送らない
 * 途中で画面を離れようとしたら、確認のモーダルを出す
 */
import { WALL } from "@kasane/core";
import type { Cell, Maze } from "@kasane/core";
import { ActionIcon, Button, Group, TextInput, Title } from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import { mazeQueries } from "../../../entities/maze";
import { ToolPalette } from "../../../features/edit-maze";
import type { MazeSize } from "../../../features/edit-maze";
import { StudentAccessLost } from "../../../shared/api";
import { NAME_MAX_LENGTH, nameOf } from "../../../shared/lib/name";
import { FailureMessage } from "../../../shared/ui/failure-message";
import { saveMaze } from "../api/save-maze";
import type { SaveTarget } from "../api/save-maze";
import { editorReducer, initialEditorState } from "../model/editor-reducer";
import { EditableGrid } from "./EditableGrid";
import { EditErrorCard } from "./EditErrorCard";
import { LayerControls } from "./LayerControls";
import { LeaveConfirm } from "./LeaveConfirm";
import { SizePicker } from "./SizePicker";

import classes from "./MazeEditor.module.css";

// 置けない理由を出しておく時間（モーダルにせず、しばらくしたら消す）
const ERROR_DURATION_MS = 3000;

// 新しく作るときに選んでおく道具。すべてゆかの迷路から始まるので、かべを塗るところから始められるようにする
const INITIAL_TOOL: Cell = WALL;

type Props = {
	target: SaveTarget;
	initialName: string;
	initialMaze: Maze;
};

export function MazeEditor({ target, initialName, initialMaze }: Props) {
	const [state, dispatch] = useReducer(editorReducer, initialMaze, initialEditorState);
	const { maze, layer, edited, error } = state;
	const [tool, setTool] = useState<Cell>(INITIAL_TOOL);
	const [input, setInput] = useState(initialName);
	const name = nameOf(input);

	// 置けない理由は、しばらくしたら消す。出し直したら時間を数え直す
	useEffect(() => {
		if (error === null) return;
		const timer = setTimeout(() => dispatch({ type: "errorExpired", error }), ERROR_DURATION_MS);
		return () => clearTimeout(timer);
	}, [error]);

	/*
	 * 保存した後の移動は、確認せずに通す
	 * 授業を続けられないとき（/joinと/endedへの移動）は、移る側がignoreBlockerで確認を飛ばす
	 */
	const saved = useRef(false);
	const blocker = useBlocker({
		shouldBlockFn: () => !saved.current,
		// 再読み込みやタブを閉じるときは、ブラウザーの確認を出す（文言はブラウザーが決める）
		enableBeforeUnload: () => !saved.current,
		withResolver: true,
	});

	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const save = useMutation({
		mutationFn: (content: { name: string; data: Maze }) => saveMaze(target, content),
		onSuccess: async (result) => {
			if (!result.ok) return;
			saved.current = true;
			// しょうさい画面は一覧のキャッシュから迷路を探すので、取り直してから移る
			await queryClient.invalidateQueries({ queryKey: mazeQueries.list().queryKey });
			// 戻ったときに、作り終えたエディタではなくホームへ戻るよう、履歴を置き換える
			await navigate({
				to: "/mazes/$mazeId",
				params: { mazeId: result.mazeId },
				replace: true,
			});
		},
		// 授業を続けられないとき（401・410）は/joinか/endedへ移る。それ以外の想定外はエラーバウンダリーで受け止める
		throwOnError: (failure) => !(failure instanceof StudentAccessLost),
	});
	const offline = save.data?.ok === false;

	const handleSave = () => {
		if (name === null || save.isPending) return;
		save.mutate({ name, data: maze });
	};

	// 部品を描き直さないよう、関数を作り直さない（道具が変わったときだけ、マス目の関数を作り直す）
	const onTap = useCallback(
		(y: number, x: number) => dispatch({ type: "cellTapped", y, x, tool }),
		[tool],
	);
	const onChooseLayer = useCallback(
		(next: number) => dispatch({ type: "layerChosen", layer: next }),
		[],
	);
	const onAddLayer = useCallback(() => dispatch({ type: "layerAdded" }), []);
	const onRemoveLayer = useCallback(() => dispatch({ type: "layerRemoved" }), []);
	const onChooseSize = useCallback((size: MazeSize) => dispatch({ type: "sizeChosen", size }), []);

	return (
		<div className={classes.screen}>
			<Group gap="sm" wrap="nowrap">
				<BackLink target={target} />
				<Title order={1}>
					{target.kind === "new" ? (
						<>
							<ruby>
								迷路<rt>めいろ</rt>
							</ruby>
							を
							<ruby>
								作<rt>つく</rt>
							</ruby>
							る
						</>
					) : (
						<>
							<ruby>
								迷路<rt>めいろ</rt>
							</ruby>
							を
							<ruby>
								変<rt>か</rt>
							</ruby>
							える
						</>
					)}
				</Title>
			</Group>
			<div className={classes.main}>
				<section className={classes.board} aria-label="マス目">
					<LayerControls
						layerCount={maze.layers.length}
						layer={layer}
						onChoose={onChooseLayer}
						onAdd={onAddLayer}
						onRemove={onRemoveLayer}
					/>
					<EditableGrid maze={maze} layer={layer} onTap={onTap} />
					{/* 画面が低くてマス目の下に収まらないときも、見えている範囲の下に出す */}
					<div className={classes.notice}>
						{error !== null && <EditErrorCard reason={error.reason} />}
					</div>
				</section>
				<div className={classes.side}>
					{/* 名前と大きさは、同じ形（見出しを上に置く）で一列に並べる */}
					<div className={classes.topRow}>
						<TextInput
							label={
								<>
									<ruby>
										迷路<rt>めいろ</rt>
									</ruby>
									の
									<ruby>
										名前<rt>なまえ</rt>
									</ruby>
								</>
							}
							classNames={{ label: classes.sectionLabel }}
							value={input}
							onChange={(event) => setInput(event.currentTarget.value)}
							maxLength={NAME_MAX_LENGTH}
							autoComplete="off"
						/>
						{/* 大きさは新しく作るときだけ選ぶ */}
						{target.kind === "new" && (
							<div className={classes.section}>
								<span className={classes.sectionLabel}>
									<ruby>
										大<rt>おお</rt>
									</ruby>
									きさ
								</span>
								<SizePicker
									size={maze.layers[0]?.length ?? 0}
									disabled={edited}
									onChoose={onChooseSize}
								/>
							</div>
						)}
					</div>
					<div className={classes.section}>
						<span className={classes.sectionLabel}>
							<ruby>
								道具<rt>どうぐ</rt>
							</ruby>
						</span>
						<ToolPalette tool={tool} startDirection={maze.startDirection} onChoose={setTool} />
					</div>
					<div className={classes.save}>
						{offline && (
							<FailureMessage>
								インターネットにつながっていません。「できあがり」をもう
								<ruby>
									一度<rt>いちど</rt>
								</ruby>
								おしてね
							</FailureMessage>
						)}
						<Button
							fullWidth
							onClick={handleSave}
							disabled={name === null}
							loading={save.isPending}
						>
							できあがり
						</Button>
					</div>
				</div>
			</div>
			{blocker.status === "blocked" && (
				<LeaveConfirm onLeave={blocker.proceed} onStay={blocker.reset} />
			)}
		</div>
	);
}

// 新しく作るときはホームへ、変えるときはじぶんのめいろのしょうさいへ戻る
function BackLink({ target }: { target: SaveTarget }) {
	if (target.kind === "new") {
		return (
			<ActionIcon
				renderRoot={(props) => <Link to="/" {...props} />}
				variant="subtle"
				aria-label="ホームにもどる"
			>
				<ChevronLeft aria-hidden size={40} />
			</ActionIcon>
		);
	}
	return (
		<ActionIcon
			renderRoot={(props) => (
				<Link to="/mazes/$mazeId" params={{ mazeId: target.mazeId }} {...props} />
			)}
			variant="subtle"
			aria-label="迷路のしょうさいにもどる"
		>
			<ChevronLeft aria-hidden size={40} />
		</ActionIcon>
	);
}
