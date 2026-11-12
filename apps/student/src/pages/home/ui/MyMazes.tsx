/*
 * ホームの「自分の迷路」（仕様書README.mdの「ホーム」）
 * 自分が作った迷路の一覧と「新しい迷路を作る」ボタン
 * チュートリアルを全部クリアするまでは、ボタンを灰色＋鍵にして押せなくし、一覧を取りに行かない（canCreateMazeが真になってからGET /me/mazes）
 * 全部クリアした後は、更新が新しい順に左上から右下へ並べる
 * 一覧は2Dのミニマップで描き（3Dはしょうさいとプレイだけ）、押すとじぶんのめいろのしょうさいへ移る
 * ミニマップには、プレイを始めたときにロボットがいる階（スタートの階）を描く
 */
import { Button, Card, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Lock, Plus } from "lucide-react";

import { MazeMap, mazeQueries, startLayer } from "../../../entities/maze";
import { StudentAccessLost } from "../../../shared/api";
import { OfflineNotice } from "../../../shared/ui/failure-message";

import classes from "./HomePage.module.css";

type Props = {
	// canCreateMaze(clearedCount)
	unlocked: boolean;
};

export function MyMazes({ unlocked }: Props) {
	if (!unlocked) {
		return (
			<div className={classes.mazesLocked}>
				<Button disabled leftSection={<Lock aria-hidden size={28} />}>
					<NewMazeLabel />
				</Button>
				<Text>
					<ruby>
						問題<rt>もんだい</rt>
					</ruby>
					を
					<ruby>
						全部<rt>ぜんぶ</rt>
					</ruby>
					クリアすると
					<ruby>
						作<rt>つく</rt>
					</ruby>
					れるよ
				</Text>
			</div>
		);
	}
	return (
		<Stack gap="md">
			<Group>
				<Button
					renderRoot={(props) => <Link to="/mazes/new" {...props} />}
					leftSection={<Plus aria-hidden size={28} />}
				>
					<NewMazeLabel />
				</Button>
			</Group>
			<MazeList />
		</Stack>
	);
}

function NewMazeLabel() {
	return (
		<>
			<ruby>
				新<rt>あたら</rt>
			</ruby>
			しい
			<ruby>
				迷路<rt>めいろ</rt>
			</ruby>
			を
			<ruby>
				作<rt>つく</rt>
			</ruby>
			る
		</>
	);
}

function MazeList() {
	const mazes = useQuery(mazeQueries.list());

	// 授業を続けられないとき（401・410）は、/joinか/endedへ移るので何も出さない
	if (mazes.isPending || mazes.error instanceof StudentAccessLost) return null;
	if (mazes.isError) return <OfflineNotice onRetry={() => void mazes.refetch()} />;

	// まだ一つも作っていない間を、全部クリアした直後として目立たせる
	if (mazes.data.length === 0) {
		return (
			<div className={`${classes.mazes} ${classes.mazesHighlighted}`}>
				<Text>
					まだ
					<ruby>
						迷路<rt>めいろ</rt>
					</ruby>
					がないよ。
					<ruby>
						作<rt>つく</rt>
					</ruby>
					ってみよう
				</Text>
			</div>
		);
	}
	return (
		<SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} className={classes.mazes}>
			{mazes.data.map(({ mazeId, name, data }) => (
				<Card
					key={mazeId}
					renderRoot={(props) => <Link to="/mazes/$mazeId" params={{ mazeId }} {...props} />}
					withBorder
					padding="md"
					radius="lg"
					className={classes.mazeCard}
				>
					<MazeMap maze={data} layer={startLayer(data)} className={classes.mazeMap} />
					{/* 児童が入れた名前は、テキストとして描く */}
					<Text fw={700}>{name}</Text>
				</Card>
			))}
		</SimpleGrid>
	);
}
