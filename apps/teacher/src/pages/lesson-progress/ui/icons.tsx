/*
 * 進み具合の状態に添えるアイコン（色だけで伝えないため。仕様書README.mdの「見た目と操作のルール」）
 * 色は親の文字の色（currentColor）を使う
 */
import type { SVGProps } from "react";

type Props = Omit<SVGProps<SVGSVGElement>, "viewBox">;

function Icon({ children, ...props }: Props) {
	return (
		<svg
			width={24}
			height={24}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden
			{...props}
		>
			{children}
		</svg>
	);
}

// チュートリアルをすべてクリア
export function StarIcon(props: Props) {
	return (
		<Icon fill="currentColor" {...props}>
			<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
		</Icon>
	);
}

// 成功（丸に✓）
export function SucceededIcon(props: Props) {
	return (
		<Icon {...props}>
			<circle cx={12} cy={12} r={10} />
			<path d="M7.5 12.5l3 3 6-7" />
		</Icon>
	);
}

// 失敗（丸に×）
export function FailedIcon(props: Props) {
	return (
		<Icon {...props}>
			<circle cx={12} cy={12} r={10} />
			<path d="M8.5 8.5l7 7M15.5 8.5l-7 7" />
		</Icon>
	);
}

// まだ送っていない（丸に横棒）
export function NotSentIcon(props: Props) {
	return (
		<Icon {...props}>
			<circle cx={12} cy={12} r={10} />
			<path d="M8 12h8" />
		</Icon>
	);
}
