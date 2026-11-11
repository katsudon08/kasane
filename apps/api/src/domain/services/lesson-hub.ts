/*
 * 授業ごとの送り先（仕様書backend.mdの「サーバーからの知らせ（SSE）」）
 * 送り先は接続ごとに一つで、同じ人が複数のタブで開けば、それぞれが送り先になる
 * 教師用と児童用を別に持ち、児童の状態（student）を児童用に送る口を作らない
 * 送り先はこのプロセスのメモリにしかないので、サーバーは1台で動かす
 */
import { ENDED } from "../entities/server-event";
import type { EndedEvent, StudentEvent } from "../entities/server-event";
import type { StudentStatus } from "../entities/student-status";

export type Subscription<Event> = {
	// 次の知らせを待つ。timeoutMsの間に届かなければnull。待つ前に届いていた知らせは、届いた順に返す
	next(timeoutMs: number): Promise<Event | null>;
	// 送り先から外す
	close(): void;
};

export type TeacherSubscription = Subscription<StudentEvent | EndedEvent>;
export type StudentSubscription = Subscription<EndedEvent>;

type Destination<Event> = {
	push(event: Event): void;
	next(timeoutMs: number): Promise<Event | null>;
};

// 届いた知らせをためておき、待っている受け取り手がいればすぐ渡す
const createDestination = <Event>(): Destination<Event> => {
	const queue: Event[] = [];
	let wake: (() => void) | null = null;

	return {
		push(event) {
			queue.push(event);
			wake?.();
		},
		next(timeoutMs) {
			const queued = queue.shift();
			if (queued !== undefined) return Promise.resolve(queued);

			return new Promise((resolve) => {
				const timer = setTimeout(() => {
					wake = null;
					resolve(null);
				}, timeoutMs);
				wake = () => {
					clearTimeout(timer);
					wake = null;
					resolve(queue.shift() ?? null);
				};
			});
		},
	};
};

type Destinations<Event> = Map<string, Set<Destination<Event>>>;

const subscribe = <Event>(
	destinations: Destinations<Event>,
	lessonId: string,
): Subscription<Event> => {
	const destination = createDestination<Event>();
	const ofLesson = destinations.get(lessonId) ?? new Set();
	destinations.set(lessonId, ofLesson.add(destination));

	return {
		next: (timeoutMs) => destination.next(timeoutMs),
		close() {
			ofLesson.delete(destination);
			// 送り先がなくなった授業は、Mapからも消す（後から同じ授業につないだ送り先のSetは消さない）
			if (ofLesson.size === 0 && destinations.get(lessonId) === ofLesson) {
				destinations.delete(lessonId);
			}
		},
	};
};

const send = <Event>(destinations: Destinations<Event>, lessonId: string, event: Event) => {
	for (const destination of destinations.get(lessonId) ?? []) destination.push(event);
};

export const createLessonHub = () => {
	const teachers: Destinations<StudentEvent | EndedEvent> = new Map();
	const students: Destinations<EndedEvent> = new Map();

	return {
		subscribeTeacher: (lessonId: string): TeacherSubscription => subscribe(teachers, lessonId),
		subscribeStudent: (lessonId: string): StudentSubscription => subscribe(students, lessonId),

		// その授業を開いている教師がいるか
		hasTeachers: (lessonId: string): boolean => teachers.has(lessonId),

		// その授業の教師だけに、児童の状態を送る。送り先がなければ何もしない
		sendStudentStatus(lessonId: string, status: StudentStatus) {
			send(teachers, lessonId, { event: "student", data: status });
		},

		// その授業の教師と児童の全員に、授業の終わりを送る
		sendEnded(lessonId: string) {
			send(teachers, lessonId, ENDED);
			send(students, lessonId, ENDED);
		},
	};
};

export type LessonHub = ReturnType<typeof createLessonHub>;
