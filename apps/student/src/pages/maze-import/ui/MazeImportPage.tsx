/*
 * めいろをもらう（仕様書README.mdの「めいろをもらう（/mazes/import）」）
 * カメラで友だちの迷路のQRを読み取り、すぐにPOST /me/mazesで自分の迷路として保存して、しょうさい画面へ移る
 * - 確かめる画面は挟まない（間違えてもらった迷路は、しょうさい画面から消せる）
 * - 保存を送っている間は、次の読み取りを受け付けない（同じQRで2つできないようにする）
 * - 読み取れないときは保存せず、カメラ映像の下に3秒ほど理由の文言を出す（モーダルにしない）
 * - チュートリアルを全部クリアするまでは、ホームへ移る（サーバーも403 mazeLockedで断る）
 */
import { canCreateMaze } from "@kasane/core";
import type { Maze } from "@kasane/core";
import { ActionIcon, Box, Container, Group, Stack, Title } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { Scanner } from "@yudiel/react-qr-scanner";
import type { IDetectedBarcode, IScannerStyles } from "@yudiel/react-qr-scanner";
import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";

import { mazeQueries } from "../../../entities/maze";
import { meQueries } from "../../../entities/student";
import { decodeMazeQr } from "../../../features/share-maze";
import { StudentAccessLost } from "../../../shared/api";
import { FailureMessage, OfflineNotice } from "../../../shared/ui/failure-message";
import { saveMaze } from "../../../widgets/maze-editor";
import type { ImportFailure } from "./ImportFailureText";
import { ImportFailureText } from "./ImportFailureText";

/*
 * 部品の既定は幅・高さとも最低640pxを求め、満たせないカメラでは映像が出ないので、望ましい大きさだけを伝える
 * 背面のカメラを使う（タブレットを友だちのタブレットの画面に向ける）
 */
const CONSTRAINTS: MediaTrackConstraints = {
	facingMode: "environment",
	width: { ideal: 1280 },
	height: { ideal: 720 },
};

// QRの読み取り間隔（仕様書backend.mdの「性能」のカメラ）
const SCAN_INTERVAL_MS = 300;

// 見出しと文言の残りの高さいっぱいに映す（枠に合わせて映像の端を切る）
const SCANNER_STYLES: IScannerStyles = {
	container: { position: "absolute", inset: 0, width: "auto", height: "auto", aspectRatio: "auto" },
};

// とても低い画面でも、QRコードが写る大きさは残す（そのときだけ縦に送る）
const MIN_CAMERA_HEIGHT = 240;

// 読み取れない理由を出しておく時間（モーダルにせず、しばらくしたら消す）
const FAILURE_DURATION_MS = 3000;

export function MazeImportPage() {
	const me = useQuery(meQueries.me());

	// 読み込み中・授業を続けられないとき（/joinか/endedへ移る）は何も出さない
	if (me.error instanceof StudentAccessLost) return null;
	if (me.data === undefined) {
		return me.isError ? (
			<Container size="lg" py="xl">
				<OfflineNotice onRetry={() => void me.refetch()} />
			</Container>
		) : null;
	}
	if (!canCreateMaze(me.data.clearedCount)) return <Navigate to="/" replace />;

	return <MazeScanner />;
}

function MazeScanner() {
	const [failure, setFailure] = useState<ImportFailure | null>(null);
	const [cameraUnavailable, setCameraUnavailable] = useState(false);

	// 読み取れない理由は、しばらくしたら消す。出し直したら時間を数え直す
	useEffect(() => {
		if (failure === null) return;
		const timer = setTimeout(() => setFailure(null), FAILURE_DURATION_MS);
		return () => clearTimeout(timer);
	}, [failure]);

	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const save = useMutation({
		mutationFn: (content: { name: string; data: Maze }) => saveMaze({ kind: "new" }, content),
		onSuccess: async (result) => {
			if (!result.ok) {
				setFailure(result.reason);
				return;
			}
			/*
			 * しょうさい画面は一覧のキャッシュから迷路を探すので、取り直してから移る
			 * この画面は一覧を使っていないので、使われていないキャッシュも取り直す
			 */
			await queryClient.invalidateQueries({
				queryKey: mazeQueries.list().queryKey,
				refetchType: "all",
			});
			// 戻ったときに、この画面ではなくホームへ戻るよう、履歴を置き換える
			await navigate({ to: "/mazes/$mazeId", params: { mazeId: result.mazeId }, replace: true });
		},
		// 授業を続けられないとき（401・410）は/joinか/endedへ移る。それ以外の想定外はエラーバウンダリーで受け止める
		throwOnError: (error) => !(error instanceof StudentAccessLost),
	});

	const handleScan = ([code]: IDetectedBarcode[]) => {
		// 保存を送っている間と、保存できて移る間は、次の読み取りを受け付けない
		if (code === undefined || save.isPending || save.data?.ok === true) return;

		const decoded = decodeMazeQr(code.rawValue);
		if (!decoded.ok) {
			setFailure(decoded.reason);
			return;
		}
		setFailure(null);
		save.mutate({ name: decoded.name, data: decoded.maze });
	};

	return (
		// 画面の縦幅に収める。カメラは見出しと文言の残りの高さを使う
		<Container size="md" py="xl" h="100dvh">
			<Stack gap="lg" h="100%">
				<Group gap="sm" wrap="nowrap">
					<ActionIcon
						renderRoot={(props) => <Link to="/" {...props} />}
						variant="subtle"
						aria-label="ホームにもどる"
					>
						<ChevronLeft aria-hidden size={40} />
					</ActionIcon>
					<Title order={1}>
						<ruby>
							迷路<rt>めいろ</rt>
						</ruby>
						をもらう
					</Title>
				</Group>
				<Title order={2} size="h3">
					<ruby>
						友<rt>とも</rt>
					</ruby>
					だちの
					<ruby>
						迷路<rt>めいろ</rt>
					</ruby>
					のQRコードを
					<ruby>
						写<rt>うつ</rt>
					</ruby>
					してね
				</Title>
				<Box pos="relative" flex={1} mih={MIN_CAMERA_HEIGHT}>
					<Scanner
						onScan={handleScan}
						onError={() => setCameraUnavailable(true)}
						formats={["qr_code"]}
						constraints={CONSTRAINTS}
						retryDelay={SCAN_INTERVAL_MS}
						/*
						 * 部品の既定のライトのボタンは小さく、名前が英語なので出さない
						 * 狙いの枠は横幅から決まる正方形で、横長の画面では上下が切れるので出さない（映像全体で読み取る）
						 */
						components={{ torch: false, finder: false }}
						sound={false}
						styles={SCANNER_STYLES}
					/>
				</Box>
				{failure !== null && (
					<FailureMessage>
						<ImportFailureText reason={failure} />
					</FailureMessage>
				)}
				{cameraUnavailable && (
					<FailureMessage>
						カメラが
						<ruby>
							使<rt>つか</rt>
						</ruby>
						えません。
						<ruby>
							先生<rt>せんせい</rt>
						</ruby>
						に
						<ruby>
							聞<rt>き</rt>
						</ruby>
						いてね
					</FailureMessage>
				)}
			</Stack>
		</Container>
	);
}
