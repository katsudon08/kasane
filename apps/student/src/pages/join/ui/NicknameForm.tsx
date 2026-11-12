/*
 * ニックネームを入れて授業に参加する（仕様書README.mdの「授業に参加する」の2・3と失敗時の表示）
 * 参加できたら、前の授業で読み込んだ値を捨ててからホームへ移る
 */
import { Button, Container, Stack, Text } from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { SubmitEvent } from "react";

import { FailureMessage, OfflineNotice } from "../../../shared/ui/failure-message";
import { NameInput } from "../../../shared/ui/name-input";
import { joinLesson } from "../api/join-lesson";
import { nicknameOf } from "../lib/nickname";

type Props = {
	lessonId: string;
	// 授業が見つからなかった。QRコードを写し直してもらう
	onInvalidLesson: () => void;
};

export function NicknameForm({ lessonId, onInvalidLesson }: Props) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [input, setInput] = useState("");
	const nickname = nicknameOf(input);

	const join = useMutation({
		mutationFn: joinLesson,
		onSuccess: async (result) => {
			if (!result.ok) {
				if (result.failure === "invalidLesson") onInvalidLesson();
				return;
			}
			// 前の授業の名前やクリア数を、新しい児童の画面に持ち越さない
			queryClient.removeQueries();
			await navigate({ to: "/", replace: true });
		},
	});
	// 想定外の例外も、通信できなかったときと同じく、もう一度押してもらう
	const failure = join.isError ? "offline" : join.data?.ok === false ? join.data.failure : null;

	const submit = () => {
		if (nickname === null || join.isPending) return;
		join.mutate({ lessonId, name: nickname });
	};
	const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();
		submit();
	};

	return (
		<Container size="sm" py="xl">
			<form onSubmit={handleSubmit}>
				<Stack gap="lg">
					<Stack gap="xs">
						<NameInput
							label={
								<>
									ニックネームを
									<ruby>
										入<rt>い</rt>
									</ruby>
									れてね
								</>
							}
							value={input}
							onChange={setInput}
						/>
						<Text size="xs" c="dimmed">
							<ruby>
								自分<rt>じぶん</rt>
							</ruby>
							の
							<ruby>
								本当<rt>ほんとう</rt>
							</ruby>
							の
							<ruby>
								名前<rt>なまえ</rt>
							</ruby>
							は
							<ruby>
								入<rt>い</rt>
							</ruby>
							れないでね
						</Text>
					</Stack>

					{failure === "lessonEnded" && (
						<FailureMessage>
							この
							<ruby>
								授業<rt>じゅぎょう</rt>
							</ruby>
							は
							<ruby>
								終<rt>お</rt>
							</ruby>
							わっています。
							<ruby>
								先生<rt>せんせい</rt>
							</ruby>
							に
							<ruby>
								聞<rt>き</rt>
							</ruby>
							いてね
						</FailureMessage>
					)}
					{failure === "lessonFull" && (
						<FailureMessage>
							この
							<ruby>
								授業<rt>じゅぎょう</rt>
							</ruby>
							にはこれ
							<ruby>
								以上<rt>いじょう</rt>
							</ruby>
							<ruby>
								参加<rt>さんか</rt>
							</ruby>
							できません。
							<ruby>
								先生<rt>せんせい</rt>
							</ruby>
							に
							<ruby>
								聞<rt>き</rt>
							</ruby>
							いてね
						</FailureMessage>
					)}

					{failure === "offline" ? (
						<OfflineNotice onRetry={submit} disabled={nickname === null || join.isPending} />
					) : (
						<Button type="submit" disabled={nickname === null || join.isPending}>
							この
							<ruby>
								名前<rt>なまえ</rt>
							</ruby>
							で
							<ruby>
								始<rt>はじ</rt>
							</ruby>
							める
						</Button>
					)}
				</Stack>
			</form>
		</Container>
	);
}
