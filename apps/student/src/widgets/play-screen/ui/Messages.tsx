/*
 * プレイ画面の文言（仕様書domain.mdの「児童画面の文言」、README.mdの「授業に参加する」の通信できない）
 * 漢字は小学6年生までのもの、ルビは<ruby>で組む。「枚」「壁」「鍵」は小学校で習わないのでひらがな
 * 数（{n}・{limit}）は要素の子として差し込み、文言の文字列に連結しない
 */
import type { Outcome } from "@kasane/core";

import type { Notice } from "../model/play-reducer";

// 「つくる」の間の、カードを入れられなかった・送れなかったときの文言
export function NoticeText({ notice }: { notice: Notice }) {
	switch (notice.kind) {
		case "offline":
			return (
				<>
					インターネットにつながっていません。「ロボットを
					<ruby>
						動<rt>うご</rt>
					</ruby>
					かす」をもう
					<ruby>
						一度<rt>いちど</rt>
					</ruby>
					おしてね
				</>
			);
		case "endOutsideRepeat":
			return (
				<>
					「くりかえし
					<ruby>
						終<rt>お</rt>
					</ruby>
					わり」は、「くりかえす」の
					<ruby>
						中<rt>なか</rt>
					</ruby>
					でだけ
					<ruby>
						使<rt>つか</rt>
					</ruby>
					えるよ
				</>
			);
		case "programError": {
			const { kind, limit } = notice.error;
			switch (kind) {
				case "tooManyCards":
					return (
						<>
							この
							<ruby>
								問題<rt>もんだい</rt>
							</ruby>
							では、カードは{limit}まいまでだよ
						</>
					);
				case "tooManyCommands":
					return (
						<>
							カードが
							<ruby>
								多<rt>おお</rt>
							</ruby>
							すぎるよ。{limit}
							<ruby>
								個<rt>こ</rt>
							</ruby>
							までにしてね
						</>
					);
				case "tooDeep":
					return (
						<>
							「くりかえす」の
							<ruby>
								中<rt>なか</rt>
							</ruby>
							の「くりかえす」は、{limit}つまでだよ
						</>
					);
			}
		}
	}
}

type OutcomeTextProps = {
	outcome: Outcome;
	// 原因のカードの番号（bumpとfallだけ）
	cardNumber: number | null;
};

// 結果の文言
export function OutcomeText({ outcome, cardNumber }: OutcomeTextProps) {
	switch (outcome) {
		case "goal":
			return (
				<>
					ゴールに
					<ruby>
						着<rt>つ</rt>
					</ruby>
					いた！
				</>
			);
		case "bump":
			return (
				<>
					{cardNumber}まい
					<ruby>
						目<rt>め</rt>
					</ruby>
					のカードで、かべにぶつかったよ。
					<ruby>
						赤<rt>あか</rt>
					</ruby>
					いカードのあたりを
					<ruby>
						見直<rt>みなお</rt>
					</ruby>
					そう
				</>
			);
		case "fall":
			return (
				<>
					{cardNumber}まい
					<ruby>
						目<rt>め</rt>
					</ruby>
					のカードで、
					<ruby>
						穴<rt>あな</rt>
					</ruby>
					に
					<ruby>
						落<rt>お</rt>
					</ruby>
					ちたよ。「
					<ruby>
						穴<rt>あな</rt>
					</ruby>
					をうめる」カードでうめられるよ
				</>
			);
		case "notReached":
			return (
				<>
					カードが
					<ruby>
						全部<rt>ぜんぶ</rt>
					</ruby>
					<ruby>
						終<rt>お</rt>
					</ruby>
					わったけど、ゴールに
					<ruby>
						着<rt>つ</rt>
					</ruby>
					いていないよ。カードを
					<ruby>
						足<rt>た</rt>
					</ruby>
					そう
				</>
			);
		case "missingKeys":
			return (
				<>
					かぎを
					<ruby>
						全部<rt>ぜんぶ</rt>
					</ruby>
					<ruby>
						取<rt>と</rt>
					</ruby>
					ってからゴールしよう
				</>
			);
		case "tooLong":
			return (
				<>
					<ruby>
						動<rt>うご</rt>
					</ruby>
					きが
					<ruby>
						多<rt>おお</rt>
					</ruby>
					すぎるよ。「くりかえす」の
					<ruby>
						回数<rt>かいすう</rt>
					</ruby>
					を
					<ruby>
						見直<rt>みなお</rt>
					</ruby>
					そう
				</>
			);
	}
}
