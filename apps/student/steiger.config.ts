import fsd from "@feature-sliced/steiger-plugin";
import { defineConfig } from "steiger";

export default defineConfig([
	...fsd.configs.recommended,
	{
		ignores: ["**/routeTree.gen.ts"],
	},
	{
		/*
		 * カードの並びの編集は、仕様書domain.mdの「カードの並びの編集（児童の端末）」が
		 * プレイの機能（features層）に置くと決めている。使うのはプレイ画面（widgets/play-screen）だけなので、
		 * 参照が一つだけのスライスを統合するよう勧める決まりを、このスライスにだけ当てない
		 */
		files: ["./src/features/edit-program/**"],
		rules: { "fsd/insignificant-slice": "off" },
	},
]);
