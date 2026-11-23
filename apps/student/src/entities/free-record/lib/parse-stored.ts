// localStorageから読んだ文字列をJSONとして読む。保存されていない（null）・JSONとして読めないときはundefined
export function parseStored(stored: string | null): unknown {
	if (stored === null) return undefined;
	try {
		return JSON.parse(stored);
	} catch {
		return undefined;
	}
}
