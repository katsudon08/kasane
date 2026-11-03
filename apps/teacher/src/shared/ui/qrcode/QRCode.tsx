import { QRCodeSVG } from "qrcode.react";
import type { ComponentProps, ReactNode } from "react";

export type Props = Omit<ComponentProps<typeof QRCodeSVG>, "value" | "fallback"> & {
	value: string;
	fallback: ReactNode;
};

export function QRCode({ value, fallback, ...props }: Props) {
	if (value === "") return fallback;

	return <QRCodeSVG value={value} {...props} />;
}
