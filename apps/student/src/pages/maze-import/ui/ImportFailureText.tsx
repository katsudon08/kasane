/*
 * 迷路のQRを読み取れないときの文言（仕様書README.mdの「めいろをもらう（/mazes/import）」）
 * 何が起きたかと、次にどうするかをセットにする
 */
import type { DecodeMazeQrResult } from "../../../features/share-maze";

type DecodeFailure = Extract<DecodeMazeQrResult, { ok: false }>["reason"];

// QRの中身の失敗と、保存を送れなかった（通信できない）とき
export type ImportFailure = DecodeFailure | "offline";

export function ImportFailureText({ reason }: { reason: ImportFailure }) {
	switch (reason) {
		case "notMazeQr":
			return (
				<>
					これは
					<ruby>
						迷路<rt>めいろ</rt>
					</ruby>
					のQRコードではないよ。
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
				</>
			);
		case "brokenMaze":
			return (
				<>
					このQRコードの
					<ruby>
						迷路<rt>めいろ</rt>
					</ruby>
					は
					<ruby>
						読<rt>よ</rt>
					</ruby>
					みこめないよ。
					<ruby>
						友<rt>とも</rt>
					</ruby>
					だちに、QRコードをもう
					<ruby>
						一度<rt>いちど</rt>
					</ruby>
					<ruby>
						見<rt>み</rt>
					</ruby>
					せてもらってね
				</>
			);
		case "offline":
			return (
				<>
					インターネットにつながっていません。もう
					<ruby>
						一度<rt>いちど</rt>
					</ruby>
					<ruby>
						写<rt>うつ</rt>
					</ruby>
					してね
				</>
			);
	}
}
