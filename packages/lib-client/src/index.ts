import { treaty } from "@elysiajs/eden";
import type { App } from "@kasane/api";

export const createClient = (url: string) => treaty<App>(url);
