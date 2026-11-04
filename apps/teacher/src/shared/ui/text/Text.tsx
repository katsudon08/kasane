import { Text as MantineText, type TextProps as MantineTextProps } from "@mantine/core";
import type { ComponentProps } from "react";

export type Props = MantineTextProps & Omit<ComponentProps<"p">, keyof MantineTextProps>;

export function Text(props: Props) {
	return <MantineText {...props} />;
}
