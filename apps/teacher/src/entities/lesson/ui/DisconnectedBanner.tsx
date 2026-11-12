/*
 * 5秒以上サーバーとつながらないときに、画面の上部に出す帯（仕様書README.mdの「QRコードを見せる」「進み具合」、backend.mdの「再接続」）
 * 進み具合が古いままになることを知らせる。つながったら消す
 */
import { Alert } from "@mantine/core";

import { Loader } from "../../../shared/ui/loader";
import { Text } from "../../../shared/ui/text";

export function DisconnectedBanner() {
	return (
		<Alert color="yellow" radius={0} icon={<Loader size="sm" type="oval" color="yellow" />}>
			<Text>つながっていません。つなぎ直しています</Text>
		</Alert>
	);
}
