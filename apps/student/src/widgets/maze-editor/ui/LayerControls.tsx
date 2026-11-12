/*
 * 階の切り替えと、階を足す・減らすボタン（仕様書README.mdの「めいろをつくる / 変える」）
 * 今編集している階は青の塗りつぶし、他は枠だけにする
 * 足す・減らすは押せないようにはせず、できないときは理由の文言を出す
 */
import { Button, Group } from "@mantine/core";
import { Minus, Plus } from "lucide-react";
import { memo } from "react";

type Props = {
	layerCount: number;
	layer: number;
	onChoose: (layer: number) => void;
	onAdd: () => void;
	onRemove: () => void;
};

export const LayerControls = memo(function LayerControls({
	layerCount,
	layer,
	onChoose,
	onAdd,
	onRemove,
}: Props) {
	return (
		<Group gap="sm">
			<Group gap="xs" role="group" aria-label="階">
				{Array.from({ length: layerCount }, (_, index) => (
					<Button
						// 階は下から順に並び、入れ替わらないので、位置をkeyにする
						key={index}
						variant={index === layer ? "filled" : "outline"}
						aria-pressed={index === layer}
						onClick={() => onChoose(index)}
					>
						{index + 1}
						<ruby>
							階<rt>かい</rt>
						</ruby>
					</Button>
				))}
			</Group>
			<Group gap="xs">
				<Button variant="default" leftSection={<Plus aria-hidden size={28} />} onClick={onAdd}>
					<ruby>
						階<rt>かい</rt>
					</ruby>
					を
					<ruby>
						足<rt>た</rt>
					</ruby>
					す
				</Button>
				<Button variant="default" leftSection={<Minus aria-hidden size={28} />} onClick={onRemove}>
					<ruby>
						階<rt>かい</rt>
					</ruby>
					を
					<ruby>
						減<rt>へ</rt>
					</ruby>
					らす
				</Button>
			</Group>
		</Group>
	);
});
