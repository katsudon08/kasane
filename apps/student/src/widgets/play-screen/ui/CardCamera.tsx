/*
 * カードを読み取るカメラ（仕様書README.mdの「プレイ」「プログラムをつくる」、domain.mdの「カードの読み取り」）
 * - カメラ映像は迷路の3Dの背景を兼ねる
 * - 同じカードは、一度カメラから外して1.5秒以上たってからでないと数えない（isNewScan）
 * - KASANEのカードでないQRコードは無視する（parseCard）
 * - カードの並びが変わっても描き直さない（backend.mdの「フロントエンド共通」）。画面を離れると外れて、カメラが止まる
 */
import { isNewScan, parseCard } from "@kasane/core";
import type { Card } from "@kasane/core";
import { Scanner } from "@yudiel/react-qr-scanner";
import type { IDetectedBarcode, IScannerStyles } from "@yudiel/react-qr-scanner";
import { memo, useCallback, useRef, useState } from "react";

import { FailureMessage } from "../../../shared/ui/failure-message";

import classes from "./PlayScreen.module.css";

/*
 * 部品の既定は幅・高さとも最低640pxを求め、満たせないカメラでは映像が出ないので、望ましい大きさだけを伝える
 * 背面のカメラを使う（タブレットを机の上のカードに向ける）
 */
const CONSTRAINTS: MediaTrackConstraints = {
	facingMode: "environment",
	width: { ideal: 1280 },
	height: { ideal: 720 },
};

// QRの読み取り間隔（仕様書backend.mdの「性能」のカメラ）
const SCAN_INTERVAL_MS = 300;

// 置かれた場所いっぱいに映す（枠に合わせて映像の端を切る）
const SCANNER_STYLES: IScannerStyles = {
	container: { position: "absolute", inset: 0, width: "auto", height: "auto", aspectRatio: "auto" },
};

type Props = {
	// 新しく読み取れたカード。並びに入れるかどうかは受け取る側が決める（動かしている間は入れない）
	onCards: (cards: Card[]) => void;
};

export const CardCamera = memo(function CardCamera({ onCards }: Props) {
	// QRの中身ごとの、最後に見えた時刻
	const lastSeenAt = useRef<Readonly<Record<string, number>>>({});
	const [unavailable, setUnavailable] = useState(false);

	const handleScan = useCallback(
		(codes: IDetectedBarcode[]) => {
			const now = performance.now();
			const cards: Card[] = [];
			let seen = lastSeenAt.current;
			for (const { rawValue } of codes) {
				const card = isNewScan(rawValue, now, seen) ? parseCard(rawValue) : null;
				if (card !== null) cards.push(card);
				seen = { ...seen, [rawValue]: now };
			}
			lastSeenAt.current = seen;
			if (cards.length > 0) onCards(cards);
		},
		[onCards],
	);
	const handleError = useCallback(() => setUnavailable(true), []);

	return (
		<>
			<Scanner
				onScan={handleScan}
				onError={handleError}
				formats={["qr_code"]}
				constraints={CONSTRAINTS}
				// 同じカードを続けて使えるよう、同じQRでも毎回知らせてもらい、数えるかどうかはisNewScanで決める
				allowMultiple
				scanDelay={0}
				retryDelay={SCAN_INTERVAL_MS}
				// 既定のライトのボタンと狙いの枠は出さない（映像全体で読み取る）。音は読み取れたカードだけで鳴らす
				components={{ torch: false, finder: false }}
				sound={false}
				styles={SCANNER_STYLES}
			/>
			{unavailable && (
				<div className={classes.cameraNotice}>
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
				</div>
			)}
		</>
	);
});
