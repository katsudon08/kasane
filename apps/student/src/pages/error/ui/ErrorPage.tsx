/*
 * 描画中の例外を受け止める画面（仕様書README.mdの「うまく動かなかったときの受け止め」の児童）
 * ホームへ戻さずに読み込み直す（ホーム自体で起きたときに、同じ受け止めが繰り返されるため）
 * トークンはlocalStorageにあるので、読み込み直しても同じ児童として続けられる
 */
import { Button, Center, Stack, Title } from "@mantine/core";

export function ErrorPage() {
	return (
		<Center h="100dvh" p="xl">
			<Stack align="center" gap="xl">
				<Title order={1}>
					うまく
					<ruby>
						動<rt>うご</rt>
					</ruby>
					かなかったよ。もう
					<ruby>
						一度<rt>いちど</rt>
					</ruby>
					<ruby>
						開<rt>ひら</rt>
					</ruby>
					いてね
				</Title>
				<Button onClick={() => window.location.reload()}>
					もう
					<ruby>
						一度<rt>いちど</rt>
					</ruby>
					<ruby>
						開<rt>ひら</rt>
					</ruby>
					く
				</Button>
			</Stack>
		</Center>
	);
}
