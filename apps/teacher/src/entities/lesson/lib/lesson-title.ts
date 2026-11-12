// 授業の見出し（例:「11月5日10:40に始めた授業」）。時刻は教師のブラウザの時刻で表す
export function lessonTitle(createdAt: Date): string {
	const month = createdAt.getMonth() + 1;
	const minutes = String(createdAt.getMinutes()).padStart(2, "0");

	return `${month}月${createdAt.getDate()}日${createdAt.getHours()}:${minutes}に始めた授業`;
}
