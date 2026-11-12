import { createFileRoute } from "@tanstack/react-router";

import { JoinPage } from "../../pages/join";

type JoinSearch = {
	// 授業のID。形が正しいかは画面で確かめる
	lesson?: string;
};

export const Route = createFileRoute("/join")({
	// 数字だけの値など、文字でない値も文字にして画面に渡す（正しくないIDとして扱うため）
	validateSearch: ({ lesson }: Record<string, unknown>): JoinSearch => {
		if (lesson === undefined) return {};
		return { lesson: typeof lesson === "string" ? lesson : JSON.stringify(lesson) };
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { lesson } = Route.useSearch();
	// 別の授業のQRを読み取ったら、前の入力や失敗の文言を持ち越さないよう作り直す
	return <JoinPage key={lesson ?? ""} lessonParam={lesson} />;
}
