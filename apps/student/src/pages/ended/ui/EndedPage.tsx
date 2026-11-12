// 授業がおわりました（仕様書README.mdの「授業がおわりました」）
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
			</Stack>
		</Center>
	);
}
