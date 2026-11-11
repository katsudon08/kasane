/*
 * 授業QRを読み取る（仕様書README.mdの「授業に参加する」の1）
 * カメラ映像を大きく出し、授業QRを読み取ったら、ニックネームを入れる画面（/join?lesson=）へ移る
 * 画面を離れるとScannerが外れて、カメラが止まる
 */
import { Box, Container, Stack, Title } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { Scanner } from "@yudiel/react-qr-scanner";
import type { IDetectedBarcode, IScannerStyles } from "@yudiel/react-qr-scanner";
import { useState } from "react";

import { FailureMessage } from "../../../shared/ui/failure-message";
import { lessonIdFromJoinUrl } from "../lib/join-url";

/*
 * 部品の既定は幅・高さとも最低640pxを求め、満たせないカメラでは映像が出ないので、望ましい大きさだけを伝える
 * 背面のカメラを使う（タブレットを先生の画面に向ける）
 */
const CONSTRAINTS: MediaTrackConstraints = {
	facingMode: "environment",
	width: { ideal: 1280 },
	height: { ideal: 720 },
};

const SCAN_INTERVAL_MS = 300;

/*
 * 部品の既定は横幅いっぱいの正方形で、横長の画面では縦にはみ出す
 * 見出しと文言の残りの高さいっぱいに映す（枠に合わせて映像の端を切る）
 */
const SCANNER_STYLES: IScannerStyles = {
	container: { position: "absolute", inset: 0, width: "auto", height: "auto", aspectRatio: "auto" },
};

// とても低い画面でも、QRコードが写る大きさは残す（そのときだけ縦に送る）
const MIN_CAMERA_HEIGHT = 240;

type Props = {
	// URLの授業のIDが正しくなかった、または参加しようとして授業が見つからなかった
	invalidLesson: boolean;
};

export function LessonScanner({ invalidLesson }: Props) {
	const navigate = useNavigate();
	const [invalid, setInvalid] = useState(invalidLesson);
	const [cameraUnavailable, setCameraUnavailable] = useState(false);

	const handleScan = ([code]: IDetectedBarcode[]) => {
		if (code === undefined) return;

		const lessonId = lessonIdFromJoinUrl(code.rawValue, window.location.origin);
		if (lessonId === null) {
			setInvalid(true);
			return;
		}
		void navigate({ to: "/join", search: { lesson: lessonId } });
	};

	return (
		// 画面の縦幅に収める。カメラは見出しと文言の残りの高さを使う
		<Container size="md" py="xl" h="100dvh">
			<Stack gap="lg" h="100%">
				<Title order={1}>
					<ruby>
						先生<rt>せんせい</rt>
					</ruby>
					の
					<ruby>
						画面<rt>がめん</rt>
					</ruby>
					のQRコードを
					<ruby>
						写<rt>うつ</rt>
					</ruby>
					してください
				</Title>
				{invalid && (
					<FailureMessage>
						このQRコードでは
						<ruby>
							参加<rt>さんか</rt>
						</ruby>
						できません。
						<ruby>
							先生<rt>せんせい</rt>
						</ruby>
						の
						<ruby>
							画面<rt>がめん</rt>
						</ruby>
						のQRコードをもう
						<ruby>
							一度<rt>いちど</rt>
						</ruby>
						<ruby>
							写<rt>うつ</rt>
						</ruby>
						してね
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
				<Box pos="relative" flex={1} mih={MIN_CAMERA_HEIGHT}>
					<Scanner
						onScan={handleScan}
						onError={() => setCameraUnavailable(true)}
						formats={["qr_code"]}
						constraints={CONSTRAINTS}
						// QRの読み取り間隔（仕様書backend.mdの「性能」のカメラ）
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
			</Stack>
		</Container>
	);
}
