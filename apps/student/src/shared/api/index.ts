export { api } from "./client";
export {
	StudentAccessLost,
	hasStudentToken,
	saveStudentToken,
	withStudentToken,
} from "./student-token";
export type { AuthHeaders, StudentAccessLostReason } from "./student-token";
