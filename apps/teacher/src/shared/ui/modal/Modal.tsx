import { Modal as MantineModal, type ModalProps as MantineModalProps } from "@mantine/core";

export type Props = MantineModalProps;

export function Modal(props: Props) {
	return <MantineModal centered {...props} />;
}
