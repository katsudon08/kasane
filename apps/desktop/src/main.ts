/*
 * KASANEのデスクトップアプリ（仕様書free-mode.mdの「デスクトップアプリ」）
 * - 児童用アプリのビルドを同梱し、専用のアドレス（kasane://app/）で、自由モードのホーム（/free）を開く
 *   児童用アプリは、このアドレスの形のときにデスクトップと見分け、/freeの外へ移らない（apps/studentのshared/lib/desktop）
 * - 返すのはビルドの中のファイルだけ。CSPは児童用アプリと同じ指示にし、connect-srcは'self'だけにする（外と通信しない）
 * - カメラはアプリの画面にだけ許し、ほかの許可は出さない。アプリの外のページへは移らず、新しい窓も開かない
 * - 記録（localStorage）は、アプリの中（このアドレス）に残る
 */
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { BrowserWindow, app, net, protocol, session } from "electron";

import { appFilePath } from "./app-file.ts";

const SCHEME = "kasane";
const HOST = "app";
const START_URL = `${SCHEME}://${HOST}/free`;

/*
 * 仕様書backend.mdの「そのほかのセキュリティ設定」と同じ指示（児童用アプリのvite.config.tsが_headersに書くもの）
 * デスクトップアプリは外と通信しないので、connect-srcは'self'だけにする
 */
const CONTENT_SECURITY_POLICY = [
	"default-src 'self'",
	// QRの読み取り（zxing-wasm）とロボットのモデルの展開（meshopt）がWebAssemblyを使う
	"script-src 'self' 'wasm-unsafe-eval'",
	"connect-src 'self'",
	"img-src 'self' blob: data:",
	"font-src 'self'",
	// MantineとReact Three Fiberがstyle属性を使うので、インラインを許すのはスタイルだけにする
	"style-src 'self' 'unsafe-inline'",
	"object-src 'none'",
	"base-uri 'self'",
	"frame-ancestors 'none'",
].join("; ");

/*
 * アプリの画面のアドレスか
 * Node.jsのURLは、kasane:のような独自のプロトコルのoriginを"null"にするので、プロトコルとホストで見る
 */
function isAppUrl(value: string): boolean {
	if (!URL.canParse(value)) return false;
	const url = new URL(value);
	return url.protocol === `${SCHEME}:` && url.host === HOST;
}

// 児童用アプリのビルド。手元ではapps/student/dist、配布するアプリでは同梱した場所（配布はplan.mdのタスク25）
function studentRoot(): string {
	return app.isPackaged
		? join(process.resourcesPath, "student")
		: join(app.getAppPath(), "..", "student", "dist");
}

// アドレスのパスに当たるビルドの中のファイルを、CSPを付けて返す。ビルドの外・ないファイルは404
async function respond(request: Request): Promise<Response> {
	const file = isAppUrl(request.url)
		? appFilePath(studentRoot(), new URL(request.url).pathname)
		: null;
	if (file === null) return new Response(null, { status: 404 });

	let response: Response;
	try {
		// ファイルの種類（Content-Type）は、Chromiumがファイル名から決める
		response = await net.fetch(pathToFileURL(file).toString());
	} catch {
		// ビルドの中にないファイル
		return new Response(null, { status: 404 });
	}
	const headers = new Headers(response.headers);
	headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
	headers.set("X-Content-Type-Options", "nosniff");
	return new Response(response.body, { status: response.status, headers });
}

// カメラ（映像だけ）を、アプリの画面にだけ許す。ほかの許可（マイク・通知・位置など）は出さない
function allowCameraOnlyForApp(): void {
	session.defaultSession.setPermissionRequestHandler((_contents, permission, callback, details) => {
		const videoOnly =
			"mediaTypes" in details && (details.mediaTypes ?? []).every((type) => type === "video");
		callback(permission === "media" && videoOnly && isAppUrl(details.requestingUrl));
	});
	session.defaultSession.setPermissionCheckHandler(
		(_contents, permission, requestingOrigin) =>
			permission === "media" && isAppUrl(requestingOrigin),
	);
}

function openWindow(): void {
	const window = new BrowserWindow({
		width: 1280,
		height: 800,
		autoHideMenuBar: true,
		webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
	});
	void window.loadURL(START_URL);
}

// 独自のプロトコルを、httpsと同じように扱わせる（localStorage・カメラ・fetchが使える）。アプリの準備ができる前に登録する
protocol.registerSchemesAsPrivileged([
	{
		scheme: SCHEME,
		privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
	},
]);

// アプリの外のページへは移らず、新しい窓も開かない
app.on("web-contents-created", (_event, contents) => {
	contents.on("will-navigate", (event) => {
		if (!isAppUrl(event.url)) event.preventDefault();
	});
	contents.setWindowOpenHandler(() => ({ action: "deny" }));
});

// 窓を閉じたらアプリを終える（Macでも、窓のないまま残さない）
app.on("window-all-closed", () => app.quit());

void app.whenReady().then(() => {
	protocol.handle(SCHEME, respond);
	allowCameraOnlyForApp();
	openWindow();
});
