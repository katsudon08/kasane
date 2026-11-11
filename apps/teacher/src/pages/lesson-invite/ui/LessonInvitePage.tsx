/*
 * QRコードを見せる（仕様書README.mdの「教師の画面」のQRコードを見せる）
 * プロジェクターや大型テレビに映す前提で、授業QRを画面いっぱいに出す
 * サーバーと通信するのは教師用のSSEだけで、参加した児童の数を数える。QRの中身は画面側だけで作る
 */
import { Alert, Center, Group, Stack, Title } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";

import { useLessonEvents } from "../../../entities/lesson";
import { env } from "../../../shared/config";
import { Button } from "../../../shared/ui/button";
import { Loader } from "../../../shared/ui/loader";
import { QRCode } from "../../../shared/ui/qrcode";
import { Text } from "../../../shared/ui/text";

import classes from "./LessonInvitePage.module.css";

type Props = { lessonId: string };

export function LessonInvitePage({ lessonId }: Props) {
	const navigate = useNavigate();
	const { students, ended, disconnectedLong } = useLessonEvents(lessonId);

	if (ended) {
		return (
			<Center h="100dvh">
				<Stack align="center" gap="lg">
					<Title order={1}>この授業は終わっています</Title>
					<Button size="xl" onClick={() => void navigate({ to: "/" })}>
						ホームへ戻る
					</Button>
				</Stack>
			</Center>
		);
	}

	const joinUrl = new URL("/join", env.VITE_STUDENT_ORIGIN);
	joinUrl.searchParams.set("lesson", lessonId);

	return (
		<Stack h="100dvh" gap={0}>
			{disconnectedLong && (
				<Alert color="yellow" radius={0} icon={<Loader size="sm" type="oval" color="yellow" />}>
					<Text>つながっていません。つなぎ直しています</Text>
				</Alert>
			)}
			<Stack flex={1} align="center" justify="center" gap="lg" p="lg">
				<QRCode
					value={joinUrl.href}
					size={512}
					marginSize={2}
					title="授業に参加するためのQRコード"
					style={{ width: "min(65dvh, 90vw)", height: "auto" }}
					fallback={null}
				/>
				<Text size="xl" fw={700} ta="center">
					児童のタブレットのカメラで、このQRコードを読み取ってください
				</Text>
				<Group gap="xl">
					<Text size="xl">
						参加した児童:{" "}
						{/* 児童は減らないので、数が変わるのは増えたとき。0のまま開いたときは弾ませない */}
						<span key={students.size} className={students.size > 0 ? classes.count : undefined}>
							{students.size}
						</span>
					</Text>
					<Button
						size="xl"
						onClick={() => void navigate({ to: "/lessons/$lessonId", params: { lessonId } })}
					>
						進み具合を見る
					</Button>
				</Group>
			</Stack>
		</Stack>
	);
}
