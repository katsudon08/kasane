/*
 * URLのパスから取った授業のIDが、授業のIDの形（UUID）かどうか
 * （仕様書backend.mdの「トークン」の授業のID、「アクセス制御」、「入力の上限」）
 * 授業のIDは`gen_random_uuid()`の乱数。形が違う値は、APIのパスに入れずに「この授業は終わっています」へ回す
 * （パスに`../`や`?`を含められると、教師のトークン付きの要求が別のAPIへ飛ぶため）
 */
import { describe, expect, it } from "vitest";

import { isLessonId } from "./is-lesson-id";

describe("isLessonId", () => {
	it.each(["b4277921-b05f-4c72-833c-19f296fde6c6", "B4277921-B05F-4C72-833C-19F296FDE6C6"])(
		"UUIDの形の%sは、授業のIDの形",
		(value) => {
			expect(isLessonId(value)).toBe(true);
		},
	);

	it.each([
		"",
		"not-a-lesson",
		"x/../../lessons?",
		"b4277921-b05f-4c72-833c-19f296fde6c6/close",
		" b4277921-b05f-4c72-833c-19f296fde6c6",
		"b4277921-b05f-4c72-833c-19f296fde6c",
		"b4277921b05f4c72833c19f296fde6c6",
		"g4277921-b05f-4c72-833c-19f296fde6c6",
	])("「%s」は、授業のIDの形ではない", (value) => {
		expect(isLessonId(value)).toBe(false);
	});
});
