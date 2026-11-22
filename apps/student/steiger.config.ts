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
	{
		/*
		 * 自由モードの記録（仕様書free-mode.mdの「記録」）は、plan.mdのタスク18で純粋関数だけを先に置き、
		 * 画面から使うのはタスク21から。それまでは参照がないので、このスライスにだけ決まりを当てない
		 * タスク21で画面から参照するようになったら、この設定を消す
		 */
		files: ["./src/entities/free-record/**"],
		rules: { "fsd/insignificant-slice": "off" },
	},
]);
