/*
 * ユースケースの想定内の失敗を、状態とコードだけの応答に直す（仕様書backend.mdの「エラーの応答」）
 * 画面に出す文言は返さない
 */
import { status } from "elysia";
import type { ElysiaCustomStatusResponse } from "elysia";

import type { FailureReason } from "../domain/entities/failure";

const STATUS_OF = {
	notFound: 404,
	lessonEnded: 410,
	invalidInput: 422,
	mazeLocked: 403,
	tutorialLocked: 403,
} as const satisfies Record<FailureReason, number>;

// 失敗の理由ごとに、状態と本文の組を一つに決める（理由がユニオンのときも、組をまたがない）
type FailureResponse<Reason extends FailureReason> = Reason extends FailureReason
	? ElysiaCustomStatusResponse<(typeof STATUS_OF)[Reason], { code: Reason }>
	: never;

export const failure = <Reason extends FailureReason>(reason: Reason): FailureResponse<Reason> =>
	status(STATUS_OF[reason], { code: reason }) as FailureResponse<Reason>;
