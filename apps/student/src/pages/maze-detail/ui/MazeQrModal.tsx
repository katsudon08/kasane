/*
 * 「この迷路をQRコードで見せる」のモーダル（仕様書README.mdの「もんだいのしょうさい / じぶんのめいろのしょうさい」）
 * サーバーは呼ばず、GET /me/mazesのキャッシュの名前と形からQRを作る（encodeMazeQr）
 * 別のタブレットのカメラで読むため、QRは画面の短い辺の6〜7割ほどの大きさにし、周りに白い余白（4マス分）を取る
 */
import type { Maze } from "@kasane/core";
import { Button, Modal, Stack, Text } from "@mantine/core";
import { QRCodeSVG } from "qrcode.react";
import { useMemo } from "react";

import { encodeMazeQr } from "../../../features/share-maze";

// QRの周りの白い余白（マスの数）。カメラがQRの端を見分けられるようにする
const QUIET_ZONE = 4;

type Props = {
	name: string;
	maze: Maze;
	onClose: () => void;
};

// 開いている間だけ描く
export function MazeQrModal({ name, maze, onClose }: Props) {
	const value = useMemo(() => encodeMazeQr(name, maze), [name, maze]);

	return (
		<Modal
			opened
			onClose={onClose}
			centered
			size="auto"
			padding="xl"
			radius="lg"
			withCloseButton={false}
		>
			<Stack gap="lg" align="center">
				<Text fw={700} size="lg" ta="center">
					<ruby>
						友<rt>とも</rt>
					</ruby>
					だちのタブレットで、このQRコードを
					<ruby>
						写<rt>うつ</rt>
					</ruby>
					してもらってね
				</Text>
				<QRCodeSVG
					value={value}
					marginSize={QUIET_ZONE}
					title="迷路のQRコード"
					// SVGはインライン要素のため、文字のベースライン分の隙間が下にできないようにblockにする
					style={{ display: "block", width: "min(60dvh, 70vw)", height: "auto" }}
				/>
				{/* 児童が入れた名前は、テキストとして描く */}
				<Text fw={700} size="xl" ta="center">
					{name}
				</Text>
				<Button size="lg" onClick={onClose}>
					<ruby>
						閉<rt>と</rt>
					</ruby>
					じる
				</Button>
			</Stack>
		</Modal>
	);
}
