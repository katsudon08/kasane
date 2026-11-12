/*
 * 偽カメラに映すQRの動画を作る（docs/specs/single/plan.md「機械的なゲート」のE2E）
 * Chromiumは--use-file-for-fake-video-captureで渡したY4M（圧縮なしのI420）を、カメラの映像としてくり返し流す
 * 動画は「QRを映す→何も映さない」のくり返しにする。同じカードは一度カメラから外して1.5秒以上たたないと
 * 数えられないので（domain.md「カードの読み取り」のisNewScan）、何も映さない時間をそれより長く取る
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import qrcode from "qrcode-generator";

// 読み取りの部品の既定が幅・高さとも640px以上を求めるので、どちらも640pxにする
const WIDTH = 640;
const HEIGHT = 640;
const FRAMES_PER_SECOND = 5;
// QRを映す時間（1秒）。読み取りの間隔（300msほど）より十分長い
const SHOWN_FRAMES = FRAMES_PER_SECOND;
// 何も映さない時間（2秒）。isNewScanの1500msより長い
const HIDDEN_FRAMES = FRAMES_PER_SECOND * 2;
// QRのまわりに空ける余白（マスの数）。QRの規格が4マス以上を求める
const QUIET_ZONE = 4;
// QR（余白込み）が映像の短い辺に占める割合
const QR_RATIO = 0.75;

// I420の輝度。白と黒は、映像用の範囲（16〜235）の端にする
const WHITE = 235;
const BLACK = 16;
// 色差の中央の値（色を付けない）
const NO_COLOR = 128;

const LUMA_SIZE = WIDTH * HEIGHT;
const FRAME_SIZE = LUMA_SIZE + LUMA_SIZE / 2;

export const FORWARD_VIDEO_PATH = join(tmpdir(), "kasane-e2e", "forward.y4m");

// 一面が白のフレーム
function createBlankFrame(): Uint8Array {
	const frame = new Uint8Array(FRAME_SIZE);
	frame.fill(WHITE, 0, LUMA_SIZE);
	frame.fill(NO_COLOR, LUMA_SIZE);
	return frame;
}

// 白地の中央にQRを描いたフレーム
function createQrFrame(text: string): Uint8Array {
	const code = qrcode(0, "M");
	code.addData(text);
	code.make();

	const count = code.getModuleCount();
	const cell = Math.floor((Math.min(WIDTH, HEIGHT) * QR_RATIO) / (count + QUIET_ZONE * 2));
	const left = Math.floor((WIDTH - cell * count) / 2);
	const top = Math.floor((HEIGHT - cell * count) / 2);

	const frame = createBlankFrame();
	for (let row = 0; row < count; row += 1) {
		for (let column = 0; column < count; column += 1) {
			if (!code.isDark(row, column)) continue;
			for (let line = 0; line < cell; line += 1) {
				const start = (top + row * cell + line) * WIDTH + left + column * cell;
				frame.fill(BLACK, start, start + cell);
			}
		}
	}
	return frame;
}

// 「textのQRを1秒映す→2秒何も映さない」を1周とするY4Mの動画
export function createQrVideo(text: string): Uint8Array {
	const encoder = new TextEncoder();
	const header = encoder.encode(
		`YUV4MPEG2 W${WIDTH} H${HEIGHT} F${FRAMES_PER_SECOND}:1 Ip A1:1 C420jpeg\n`,
	);
	const frameHeader = encoder.encode("FRAME\n");
	const shown = createQrFrame(text);
	const hidden = createBlankFrame();

	const frames = [
		...Array.from({ length: SHOWN_FRAMES }, () => shown),
		...Array.from({ length: HIDDEN_FRAMES }, () => hidden),
	];
	return Buffer.concat([header, ...frames.flatMap((frame) => [frameHeader, frame])]);
}

export function writeQrVideo(path: string, text: string): void {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, createQrVideo(text));
}
