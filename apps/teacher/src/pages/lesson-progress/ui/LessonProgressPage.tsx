/*
 * 進み具合（仕様書README.mdの「教師の画面」の進み具合）
 * 児童を参加順にカードで並べる。開いたときに全児童の状態（snapshot）を受け取り、その後はSSEで変化のあった児童だけを受け取る
 */
import { Box, Container, Group, SimpleGrid, Stack, Title } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import {
	DisconnectedBanner,
	LessonEndedNotice,
	closeLesson,
	lessonQueries,
	lessonTitle,
	useLessonEvents,
} from "../../../entities/lesson";
import { Button } from "../../../shared/ui/button";
import { Loader } from "../../../shared/ui/loader";
import { Modal } from "../../../shared/ui/modal";
import { Text } from "../../../shared/ui/text";
import { StudentCard } from "./StudentCard";

type Props = { lessonId: string };

export function LessonProgressPage({ lessonId }: Props) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const lesson = useQuery(lessonQueries.detail(lessonId));
	const { students, synced, ended, disconnectedLong } = useLessonEvents(lessonId);
	const [confirmingClose, setConfirmingClose] = useState(false);
	const close = useMutation({
		mutationFn: () => closeLesson(lessonId),
		onSuccess: async () => {
			queryClient.setQueryData(lessonQueries.detail(lessonId).queryKey, { ended: true });
			void queryClient.invalidateQueries({ queryKey: lessonQueries.open().queryKey });
			await navigate({ to: "/" });
		},
	});

	// 自分で授業を終えたときは、204より先にendedが届いても「この授業は終わっています」を出さずにホームへ戻る
	const closing = close.isPending || close.isSuccess;
	if ((ended || lesson.data?.ended === true) && !closing) return <LessonEndedNotice />;

	const title =
		lesson.data !== undefined && !lesson.data.ended ? lessonTitle(lesson.data.createdAt) : null;

	return (
		<Stack mih="100dvh" gap={0}>
			{disconnectedLong && <DisconnectedBanner />}
			<Container size="xl" w="100%" py="xl">
				<Stack gap="xl">
					<Group justify="space-between" align="center">
						<Box>{title !== null && <Title order={1}>{title}</Title>}</Box>
						<Group gap="md">
							<Button
								variant="default"
								size="lg"
								onClick={() =>
									void navigate({ to: "/lessons/$lessonId/invite", params: { lessonId } })
								}
							>
								QRコードをもう一度表示する
							</Button>
							<Button variant="default" size="lg" onClick={() => setConfirmingClose(true)}>
								授業を終える
							</Button>
						</Group>
					</Group>

					{!synced && <Loader />}
					{synced && students.size === 0 && (
						<Text size="lg">
							まだ参加している児童はいません。「QRコードをもう一度表示する」を押して、児童のタブレットのカメラでQRコードを読み取ってもらってください
						</Text>
					)}
					{synced && students.size > 0 && (
						<SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
							{[...students.values()].map((student) => (
								<StudentCard
									key={student.studentId}
									name={student.name}
									clearedCount={student.clearedCount}
									lastResult={student.lastResult}
								/>
							))}
						</SimpleGrid>
					)}
				</Stack>
			</Container>

			<Modal
				opened={confirmingClose}
				onClose={() => setConfirmingClose(false)}
				title="授業を終えますか"
				size="lg"
			>
				<Stack gap="lg">
					<Text>
						授業を終えると、児童のタブレットの画面は「授業がおわりました」に変わり、この授業の続きはできなくなります
					</Text>
					{close.isError && (
						<Text c="red">
							授業を終えられませんでした。インターネットにつながっているか確かめて、もう一度「授業を終える」を押してください
						</Text>
					)}
					{/* 押した結果が分かる言葉にし、安全な側（続ける）を塗りつぶしで強調する */}
					<Group justify="flex-end" gap="md">
						<Button
							variant="outline"
							color="red"
							size="md"
							loading={close.isPending}
							onClick={() => close.mutate()}
						>
							授業を終える
						</Button>
						<Button size="md" onClick={() => setConfirmingClose(false)}>
							授業を続ける
						</Button>
					</Group>
				</Stack>
			</Modal>
		</Stack>
	);
}
