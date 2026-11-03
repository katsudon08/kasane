import { QRCodeSVG } from "qrcode.react";
import type { ComponentProps, ReactNode } from "react";

export type Props = Omit<ComponentProps<typeof QRCodeSVG>, "value"> & {
	value: string;
	fallback: ReactNode;
};

export function QRCode({ value, fallback, style, ...props }: Props) {
	if (value === "") return fallback;

	// SVGはインライン要素のため、文字のベースライン分の隙間が下にできないようにblockにする
	return <QRCodeSVG value={value} style={{ display: "block", ...style }} {...props} />;
}
