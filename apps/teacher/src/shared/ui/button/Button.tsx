import { Button as MantineButton, type ButtonProps as MantineButtonProps } from "@mantine/core";
import type { ComponentProps } from "react";

export type Props = MantineButtonProps & Omit<ComponentProps<"button">, keyof MantineButtonProps>;

export function Button(props: Props) {
	return <MantineButton {...props} />;
}
