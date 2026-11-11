/*
 * 授業QRを読み取る（仕様書README.mdの「授業に参加する」の1）
 * カメラ映像を大きく出し、授業QRを読み取ったら、ニックネームを入れる画面（/join?lesson=）へ移る
 * 画面を離れるとScannerが外れて、カメラが止まる
 */
import { Container, Stack, Title } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { Scanner } from "@yudiel/react-qr-scanner";
import type { IDetectedBarcode } from "@yudiel/react-qr-scanner";
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
		<Container size="md" py="xl">
			<Stack gap="lg">
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
				<Scanner
					onScan={handleScan}
					onError={() => setCameraUnavailable(true)}
					formats={["qr_code"]}
					constraints={CONSTRAINTS}
					sound={false}
				/>
			</Stack>
		</Container>
	);
}
