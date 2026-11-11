/*
 * QR読み取りのWASMを、児童用アプリと同じオリジンから配る
 * 部品の既定はWASMをjsDelivrから読み込むが、外部のコードは読み込まない（仕様書backend.mdの「トークン」）
 * CSPでconnect-srcを自分のオリジンとAPIに限ると、外部からは読み込めなくなる（backend.mdの「そのほかのセキュリティ設定」）
 * 配るWASMの版は、部品が使うzxing-wasmと同じにする（apps/student/qr-wasm-version.test.ts）
 */
import { prepareZXingModule } from "@yudiel/react-qr-scanner";
import wasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";

// 読み取りを始める前に一度だけ呼ぶ。WASMは読み取りを始めたときに読み込む（ここでは読み込まない）
export function serveQrWasmFromSelf(): void {
	prepareZXingModule({
		overrides: {
			locateFile: (path: string, prefix: string) =>
				path.endsWith(".wasm") ? wasmUrl : prefix + path,
		},
		fireImmediately: false,
	});
}
