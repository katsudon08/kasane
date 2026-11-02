import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		VITE_API_ORIGIN: z.url(),
	},
	runtimeEnv: import.meta.env,
});
