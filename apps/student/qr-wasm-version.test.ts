/*
 * QR読み取りのWASMを自前で配信する（仕様書backend.mdの「トークン」の「外部のスクリプトを読み込まない」、「そのほかのセキュリティ設定」のCSP）
 * @yudiel/react-qr-scannerは、barcode-detectorを通してzxing-wasmのJSを使い、WASMだけを外から読み込む
 * WASMはそのJSと同じ版でないと動かないので、自前で配る版（児童用アプリのzxing-wasm）が、部品が使う版と同じことを確かめる
 * @yudiel/react-qr-scannerを上げてzxing-wasmの版が変わったら、catalogのzxing-wasmも同じ版に上げる
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

type PackageJson = { name: string; version: string; dependencies?: Record<string, string> };

// 解決したファイルから上へたどり、名前が一致するpackage.jsonを読む（exportsにpackage.jsonがない包みもあるため）
function packageJsonOf(resolvedFile: string, name: string): PackageJson {
	let directory = dirname(resolvedFile);
	while (directory !== dirname(directory)) {
		try {
			const json = JSON.parse(readFileSync(join(directory, "package.json"), "utf8")) as PackageJson;
			if (json.name === name) return json;
		} catch (error) {
			// package.jsonがない階層は飛ばして、上へ進む
			if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
		}
		directory = dirname(directory);
	}
	throw new Error(`${name}のpackage.jsonが見つからない: ${resolvedFile}`);
}

const require = createRequire(import.meta.url);

// 自前で配る版
const servedFile = require.resolve("zxing-wasm/reader");
const served = packageJsonOf(servedFile, "zxing-wasm");

// 部品が使う版（@yudiel/react-qr-scanner → barcode-detector → zxing-wasm）
const scannerFile = require.resolve("@yudiel/react-qr-scanner");
const detectorFile = createRequire(scannerFile).resolve("barcode-detector/ponyfill");
const detector = packageJsonOf(detectorFile, "barcode-detector");
const usedFile = createRequire(detectorFile).resolve("zxing-wasm/reader");
const used = packageJsonOf(usedFile, "zxing-wasm");

describe("QR読み取りのWASMの版", () => {
	it("自前で配る版が、部品が実際に使う版と同じ", () => {
		expect(served.version).toBe(used.version);
	});

	it("自前で配る版が、barcode-detectorが求める版と同じ", () => {
		expect(served.version).toBe(detector.dependencies?.["zxing-wasm"]);
	});
});
