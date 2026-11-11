import { createClient } from "@kasane/lib-client";

import { env } from "../config";

export const api = createClient(env.VITE_API_ORIGIN);
