/*
 * トークンから本人を特定するmacro（仕様書backend.mdの「アクセス制御」「エラーの応答」）
 * ルートに`teacher: true`を付けると`teacherId`が、`student: true`を付けると`studentId`・`lessonId`・`lessonEndsAt`がハンドラに渡る
 * 本人の特定はここだけで行い、各ルートはトークンを読まない
 * 児童のトークンで呼ぶ口は授業が終わっていれば410なので、本人を特定した後に、ここ一か所で確かめる
 */
import { isLessonEnded } from "@kasane/core";
import { Elysia } from "elysia";

import type { IdentifyStudent } from "../../application/usecases/identify-student";
import type { IdentifyTeacher } from "../../application/usecases/identify-teacher";

type AuthDeps = {
	identifyTeacher: IdentifyTeacher;
	identifyStudent: IdentifyStudent;
};

// 32バイトをbase64urlにした43文字だけを通す（形が違うものはDBを引かずに弾く）
const BEARER_PATTERN = /^Bearer ([A-Za-z0-9_-]{43})$/i;

// `Authorization: Bearer {トークン}`からトークンを取り出す。ない・形が違うときはnull
export const parseBearerToken = (authorization: string | undefined): string | null =>
	authorization?.match(BEARER_PATTERN)?.[1] ?? null;

const UNAUTHORIZED = { code: "unauthorized" } as const;
const LESSON_ENDED = { code: "lessonEnded" } as const;

export const auth = ({ identifyTeacher, identifyStudent }: AuthDeps) =>
	new Elysia({ name: "auth" }).macro({
		teacher: {
			async resolve({ headers, set, status }) {
				// 認証が必要な応答はキャッシュさせない
				set.headers["cache-control"] = "no-store";

				const token = parseBearerToken(headers.authorization);
				const teacher = token === null ? null : await identifyTeacher(token);
				if (teacher === null) {
					set.headers["www-authenticate"] = "Bearer";
					return status(401, UNAUTHORIZED);
				}

				return { teacherId: teacher.teacherId };
			},
		},
		student: {
			async resolve({ headers, set, status }) {
				set.headers["cache-control"] = "no-store";

				const token = parseBearerToken(headers.authorization);
				const student = token === null ? null : await identifyStudent(token);
				if (student === null) {
					set.headers["www-authenticate"] = "Bearer";
					return status(401, UNAUTHORIZED);
				}
				if (isLessonEnded({ endsAt: student.lessonEndsAt }, new Date())) {
					return status(410, LESSON_ENDED);
				}

				return {
					studentId: student.studentId,
					lessonId: student.lessonId,
					lessonEndsAt: student.lessonEndsAt,
				};
			},
		},
	});

export type Auth = ReturnType<typeof auth>;
