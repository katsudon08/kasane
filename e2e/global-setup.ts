// E2Eの前に一度だけ、偽カメラに映す命令カード（FORWARD）のQRの動画を作る
import { FORWARD_VIDEO_PATH, writeQrVideo } from "./support/fake-camera";

export default function globalSetup(): void {
	writeQrVideo(FORWARD_VIDEO_PATH, "FORWARD");
}
