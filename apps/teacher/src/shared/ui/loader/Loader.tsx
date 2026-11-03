import { Loader as MantineLoader, type LoaderProps as MantineLoaderProps } from "@mantine/core";

export type Props = MantineLoaderProps;

export function Loader(props: Props) {
	return <MantineLoader type="dots" {...props} />;
}
