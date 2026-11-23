/*
 * 授業がおわりました（仕様書README.mdの「授業がおわりました」）
 * - 主ボタン「新しい授業に参加する」で/joinへ、副ボタン「自由に遊ぶ」で自由モードのホーム（/free）へ移る
 * - 授業が終わったトークンは、ここへ移る前に消している（shared/apiのwithStudentToken、entities/studentの見張り）
 */
import { Button, Center, Stack, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";

export function EndedPage() {
	return (
		<Center h="100dvh" p="xl">
			<Stack align="center" gap="xl">
				<Title order={1}>
					この
					<ruby>
						授業<rt>じゅぎょう</rt>
					</ruby>
					は
					<ruby>
						終<rt>お</rt>
					</ruby>
					わりました
				</Title>
				<Stack gap="md">
					<Button renderRoot={(props) => <Link to="/join" {...props} />}>
						<ruby>
							新<rt>あたら</rt>
						</ruby>
						しい
						<ruby>
							授業<rt>じゅぎょう</rt>
						</ruby>
						に
						<ruby>
							参加<rt>さんか</rt>
						</ruby>
						する
					</Button>
					<Button variant="default" renderRoot={(props) => <Link to="/free" {...props} />}>
						<ruby>
							自由<rt>じゆう</rt>
						</ruby>
						に
						<ruby>
							遊<rt>あそ</rt>
						</ruby>
						ぶ
					</Button>
				</Stack>
			</Stack>
		</Center>
	);
}
