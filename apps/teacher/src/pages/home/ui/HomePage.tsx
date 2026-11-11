/*
 * ホーム（仕様書README.mdの「教師の画面」のホーム）
 * 主ボタン「授業を始める」で授業を作ってQRコードを見せる画面へ移り、開いている授業を選ぶと進み具合へ移る
 */
import { Card, Container, Group, Stack, Title } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";

import { createLesson, lessonQueries, lessonTitle } from "../../../entities/lesson";
import { Button } from "../../../shared/ui/button";
import { Loader } from "../../../shared/ui/loader";
import { Text } from "../../../shared/ui/text";

export function HomePage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const lessons = useQuery(lessonQueries.open());
	const start = useMutation({
		mutationFn: createLesson,
		onSuccess: async (lessonId) => {
			await queryClient.invalidateQueries({ queryKey: lessonQueries.open().queryKey });
			await navigate({ to: "/lessons/$lessonId/invite", params: { lessonId } });
		},
	});

	return (
		<Container size="sm" py="xl">
			<Stack gap="xl">
				<Stack gap="xs" align="flex-start">
					<Button size="xl" loading={start.isPending} onClick={() => start.mutate()}>
						授業を始める
					</Button>
					{start.isError && (
						<Text c="red">
							授業を始められませんでした。インターネットにつながっているか確かめて、もう一度「授業を始める」を押してください
						</Text>
					)}
				</Stack>

				<Stack gap="md">
					<Title order={2}>開いている授業</Title>
					{lessons.isPending && <Loader />}
					{lessons.isError && (
						<Text c="red">
							開いている授業を読み込めませんでした。インターネットにつながっているか確かめて、ページを読み込み直してください
						</Text>
					)}
					{lessons.data?.length === 0 && (
						<Text>
							開いている授業はありません。「授業を始める」を押すと、児童が参加するためのQRコードが表示されます
						</Text>
					)}
					{lessons.data?.map(({ lessonId, createdAt, studentCount }) => (
						<Card
							key={lessonId}
							renderRoot={(props) => (
								<Link to="/lessons/$lessonId" params={{ lessonId }} {...props} />
							)}
							withBorder
							padding="lg"
						>
							<Group justify="space-between">
								<Text size="lg" fw={700}>
									{lessonTitle(new Date(createdAt))}
								</Text>
								<Text>参加している児童: {studentCount}</Text>
							</Group>
						</Card>
					))}
				</Stack>
			</Stack>
		</Container>
	);
}
