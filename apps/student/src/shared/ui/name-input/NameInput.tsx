/*
 * 名前の入力欄（ニックネームと迷路の名前。仕様書backend.mdの「入力の上限」の20文字）
 * - 入れられる文字数が分かるよう、欄の下に「8/20」のように今の文字数を出す
 * - maxlengthで止めるほか、日本語の変換が終わったところで上限までに切る（iPadのSafariは変換中にmaxlengthを超えることがある）
 */
import { TextInput } from "@mantine/core";
import type { ChangeEvent, ReactNode } from "react";

import { NAME_MAX_LENGTH, limitName } from "../../lib/name";

import classes from "./NameInput.module.css";

type Props = {
	label: ReactNode;
	value: string;
	onChange: (value: string) => void;
	labelClassName?: string;
};

// 変換中に切ると、変換の途中の字が壊れるので、変換中は切らない
function isComposing(event: ChangeEvent<HTMLInputElement>): boolean {
	const { nativeEvent } = event;
	return "isComposing" in nativeEvent && nativeEvent.isComposing === true;
}

export function NameInput({ label, value, onChange, labelClassName }: Props) {
	return (
		<TextInput
			label={label}
			value={value}
			onChange={(event) => {
				const next = event.currentTarget.value;
				onChange(isComposing(event) ? next : limitName(next));
			}}
			onCompositionEnd={(event) => onChange(limitName(event.currentTarget.value))}
			maxLength={NAME_MAX_LENGTH}
			autoComplete="off"
			description={`${value.length}/${NAME_MAX_LENGTH}`}
			inputWrapperOrder={["label", "input", "description"]}
			classNames={{ label: labelClassName, description: classes.count }}
		/>
	);
}
