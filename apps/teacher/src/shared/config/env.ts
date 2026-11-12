import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		VITE_API_ORIGIN: z.url(),
		// 授業QRに入れる児童用アプリのオリジン（授業QRの中身は{VITE_STUDENT_ORIGIN}/join?lesson={授業のID}）
		VITE_STUDENT_ORIGIN: z.url(),
	},
	runtimeEnv: import.meta.env,
});
