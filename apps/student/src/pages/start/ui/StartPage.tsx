/*
 * 入口（仕様書free-mode.mdの「入口（/start）」）
 * - 「授業に参加する」と「自由に遊ぶ」を同じ大きさ・同じ色で並べ、どちらも主ボタンにしない
 * - WindowsかMacで開いたときだけ、デスクトップアプリのダウンロードのボタン（副。二つより小さく）を出す
 * - 見出し「KASANE」は読み上げ用にだけ置く（文字は背景の画像に描く）
 */
import { Button, Stack, VisuallyHidden } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { Download } from "lucide-react";

import { desktopDownloadUrl } from "../lib/desktop-download";

import classes from "./StartPage.module.css";

/*
 * 二つの選択肢は塗らずに、太い青の枠と濃い青の文字にする（どちらも主ボタンにしない）
 * 部品は枠の色をstyle属性に書くので、CSSのクラスではなくstylesで上書きする
 */
const CHOICE_STYLES = {
	root: {
		border: "3px solid var(--mantine-color-blue-7)",
		color: "var(--mantine-color-blue-8)",
	},
};

export function StartPage() {
	// 端末の名乗りは画面を開いている間に変わらないので、描くたびに求めてよい（軽い）
	const downloadUrl = desktopDownloadUrl(navigator);

	return (
		<main className={classes.page}>
			<VisuallyHidden component="h1">KASANE</VisuallyHidden>
			<div className={classes.panel}>
				<Stack gap="lg">
					<Button
						variant="outline"
						fullWidth
						styles={CHOICE_STYLES}
						renderRoot={(props) => <Link to="/join" {...props} />}
					>
						<ruby>
							授業<rt>じゅぎょう</rt>
						</ruby>
						に
						<ruby>
							参加<rt>さんか</rt>
						</ruby>
						する
					</Button>
					<Button
						variant="outline"
						fullWidth
						styles={CHOICE_STYLES}
						renderRoot={(props) => <Link to="/free" {...props} />}
					>
						<ruby>
							自由<rt>じゆう</rt>
						</ruby>
						に
						<ruby>
							遊<rt>あそ</rt>
						</ruby>
						ぶ
					</Button>
					{downloadUrl !== null && (
						<Button
							component="a"
							href={downloadUrl}
							variant="subtle"
							size="md"
							// 二つのボタンより小さく見せるため、全幅に伸ばさず文言の幅にする
							style={{ alignSelf: "center" }}
							leftSection={<Download aria-hidden size={24} />}
						>
							パソコン
							<ruby>
								用<rt>よう</rt>
							</ruby>
							のKASANEをダウンロードする
						</Button>
					)}
				</Stack>
			</div>
		</main>
	);
}
