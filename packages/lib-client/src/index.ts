import { treaty } from "@elysia/eden";
import type { App } from "@kasane/api";

export const createClient = (url: string) => treaty<App>(url);
