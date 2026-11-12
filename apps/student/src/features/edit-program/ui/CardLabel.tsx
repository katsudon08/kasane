/*
 * カードの名前（仕様書domain.mdの「命令カード」の表）
 * 「埋める」「繰り返す」は小学校で習わない漢字なのでひらがな。漢字にはすべてルビを振る
 */
import type { CardType } from "@kasane/core";
import type { ReactNode } from "react";

export function CardName({ type }: { type: CardType }): ReactNode {
	switch (type) {
		case "forward":
			return (
				<>
					<ruby>
						前<rt>まえ</rt>
					</ruby>
					に
					<ruby>
						進<rt>すす</rt>
					</ruby>
					む
				</>
			);
		case "right":
			return (
				<>
					<ruby>
						右<rt>みぎ</rt>
					</ruby>
					に
					<ruby>
						曲<rt>ま</rt>
					</ruby>
					がる
				</>
			);
		case "left":
			return (
				<>
					<ruby>
						左<rt>ひだり</rt>
					</ruby>
					に
					<ruby>
						曲<rt>ま</rt>
					</ruby>
					がる
				</>
			);
		case "fill":
			return (
				<>
					<ruby>
						穴<rt>あな</rt>
					</ruby>
					をうめる
				</>
			);
		case "repeat":
			return <>くりかえす</>;
		case "end":
			return (
				<>
					くりかえし
					<ruby>
						終<rt>お</rt>
					</ruby>
					わり
				</>
			);
	}
}
